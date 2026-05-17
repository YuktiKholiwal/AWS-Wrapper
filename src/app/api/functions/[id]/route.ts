import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import {
  getFunction,
  updateFunction,
  deleteFunction,
} from "@/lib/db/queries/functions";
import { assumeRole } from "@/lib/aws/assume-role";
import { getStackStatus, deleteStack } from "@/lib/aws/cloudformation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const fn = await getFunction(id, userId);
  if (!fn) {
    return NextResponse.json(
      { error: "Function not found" },
      { status: 404 },
    );
  }

  if (fn.status === "provisioning") {
    const connection = await getAwsConnection(userId);
    if (connection) {
      try {
        const credentials = await assumeRole(
          connection.roleArn,
          connection.externalId,
        );
        const stackResult = await getStackStatus(
          credentials,
          connection.region,
          fn.stackName,
        );

        if (
          stackResult.status === "CREATE_COMPLETE" &&
          stackResult.rawOutputs
        ) {
          const updated = await updateFunction(fn.id, {
            status: "live",
            functionArn: stackResult.rawOutputs["FunctionArn"] ?? null,
            apiEndpoint: stackResult.rawOutputs["ApiEndpoint"] ?? null,
          });
          return NextResponse.json({ function: updated });
        }

        if (
          stackResult.status === "CREATE_FAILED" ||
          stackResult.status === "ROLLBACK_COMPLETE"
        ) {
          const updated = await updateFunction(fn.id, { status: "failed" });
          return NextResponse.json({ function: updated });
        }
      } catch {
        // Stack check failed — return current DB state
      }
    }
  }

  return NextResponse.json({ function: fn });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const fn = await getFunction(id, userId);
  if (!fn) {
    return NextResponse.json(
      { error: "Function not found" },
      { status: 404 },
    );
  }

  await updateFunction(fn.id, { status: "deleting" });

  const connection = await getAwsConnection(userId);
  if (connection) {
    try {
      const credentials = await assumeRole(
        connection.roleArn,
        connection.externalId,
      );
      await deleteStack(credentials, connection.region, fn.stackName);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete function";
      return NextResponse.json({ error: message }, { status: 422 });
    }
  }

  await deleteFunction(fn.id);
  return NextResponse.json({ success: true });
}
