import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { getFunction, updateFunction } from "@/lib/db/queries/functions";
import { assumeRole } from "@/lib/aws/assume-role";
import { updateFunctionEnvVars } from "@/lib/aws/lambda-config";

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

  return NextResponse.json({ envVars: fn.envVars ?? {} });
}

export async function PUT(request: Request, { params }: RouteParams) {
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
      { error: "Function must be live" },
      { status: 400 },
    );
  }

  const body = await request.json();
  const envVars = body.envVars;
  if (!envVars || typeof envVars !== "object") {
    return NextResponse.json(
      { error: "envVars must be an object" },
      { status: 400 },
    );
  }

  const connection = await getAwsConnection(userId);
  if (!connection) {
    return NextResponse.json(
      { error: "No account connection" },
      { status: 400 },
    );
  }

  try {
    const credentials = await assumeRole(
      connection.roleArn,
      connection.externalId,
    );

    const functionName = `plot-fn-${fn.id}`;
    await updateFunctionEnvVars(
      credentials,
      connection.region,
      functionName,
      envVars,
    );

    await updateFunction(fn.id, { envVars });

    return NextResponse.json({ envVars });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update env vars";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
