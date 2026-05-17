import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { getFunction, updateFunction } from "@/lib/db/queries/functions";
import { assumeRole } from "@/lib/aws/assume-role";
import { updateFunctionCode, zipFunctionCode } from "@/lib/aws/lambda";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
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

  if (fn.status !== "live") {
    return NextResponse.json(
      { error: "Function must be live before deploying code" },
      { status: 400 },
    );
  }

  const body = await request.json();
  const code = body.code;
  if (!code || typeof code !== "string") {
    return NextResponse.json(
      { error: "Code is required" },
      { status: 400 },
    );
  }

  const connection = await getAwsConnection(userId);
  if (!connection) {
    return NextResponse.json(
      { error: "No account connection found" },
      { status: 400 },
    );
  }

  try {
    const credentials = await assumeRole(
      connection.roleArn,
      connection.externalId,
    );

    const zipBuffer = zipFunctionCode(code, fn.handler);
    const functionName = `plot-fn-${fn.id}`;

    await updateFunctionCode(
      credentials,
      connection.region,
      functionName,
      zipBuffer,
    );

    await updateFunction(fn.id, { code });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to deploy code";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
