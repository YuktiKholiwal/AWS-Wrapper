import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { getFunction } from "@/lib/db/queries/functions";
import { assumeRole } from "@/lib/aws/assume-role";
import { invokeFunction } from "@/lib/aws/lambda";

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
      { error: "Function must be live before testing" },
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
    const body = await request.json().catch(() => ({}));
    const payload = JSON.stringify(body.payload ?? {});

    const credentials = await assumeRole(
      connection.roleArn,
      connection.externalId,
    );

    const functionName = `plot-fn-${fn.id}`;
    const result = await invokeFunction(
      credentials,
      connection.region,
      functionName,
      payload,
    );

    return NextResponse.json({ result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to invoke function";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
