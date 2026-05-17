import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import {
  getDatabase,
  updateDatabase,
  deleteDatabase,
} from "@/lib/db/queries/databases";
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
  const database = await getDatabase(id, userId);
  if (!database) {
    return NextResponse.json(
      { error: "Database not found" },
      { status: 404 },
    );
  }

  if (database.status === "provisioning") {
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
          database.stackName,
        );

        if (
          stackResult.status === "CREATE_COMPLETE" &&
          stackResult.rawOutputs
        ) {
          const updated = await updateDatabase(database.id, {
            status: "live",
            tableName: stackResult.rawOutputs["TableName"] ?? null,
            tableArn: stackResult.rawOutputs["TableArn"] ?? null,
            region: stackResult.rawOutputs["Region"] ?? connection.region,
          });
          return NextResponse.json({ database: updated });
        }

        if (
          stackResult.status === "CREATE_FAILED" ||
          stackResult.status === "ROLLBACK_COMPLETE"
        ) {
          const updated = await updateDatabase(database.id, {
            status: "failed",
          });
          return NextResponse.json({ database: updated });
        }
      } catch {
        // return current state
      }
    }
  }

  return NextResponse.json({ database });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const database = await getDatabase(id, userId);
  if (!database) {
    return NextResponse.json(
      { error: "Database not found" },
      { status: 404 },
    );
  }

  await updateDatabase(database.id, { status: "deleting" });

  const connection = await getAwsConnection(userId);
  if (connection) {
    try {
      const credentials = await assumeRole(
        connection.roleArn,
        connection.externalId,
      );
      await deleteStack(credentials, connection.region, database.stackName);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete database";
      return NextResponse.json({ error: message }, { status: 422 });
    }
  }

  await deleteDatabase(database.id);
  return NextResponse.json({ success: true });
}
