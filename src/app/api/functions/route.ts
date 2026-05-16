import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import {
  createFunction,
  getFunctionsByUser,
  updateFunction,
} from "@/lib/db/queries/functions";
import { assumeRole } from "@/lib/aws/assume-role";
import { deployStack } from "@/lib/aws/cloudformation";
import { lambdaFunctionTemplate } from "@/lib/aws/templates/lambda-function";

const generateId = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  12,
);

const STARTER_CODE = `export const handler = async (event) => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Hello from Plot!" }),
  };
};
`;

const createFunctionSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be 50 characters or less")
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      "Lowercase, alphanumeric, and hyphens only",
    ),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createFunctionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid input",
        details: z.flattenError(parsed.error).fieldErrors,
      },
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

  const fnId = generateId();
  const stackName = `plot-fn-${fnId}`;

  const fn = await createFunction({
    id: fnId,
    userId,
    name: parsed.data.name,
    code: STARTER_CODE,
    stackName,
  });

  try {
    const credentials = await assumeRole(
      connection.roleArn,
      connection.externalId,
    );

    await deployStack(credentials, connection.region, stackName, lambdaFunctionTemplate, {
      FunctionName: fnId,
      Runtime: "nodejs20.x",
      Handler: "index.handler",
      Timeout: "30",
      MemorySize: "128",
    });

    await updateFunction(fnId, { status: "provisioning" });

    return NextResponse.json(
      { function: { ...fn, status: "provisioning" } },
      { status: 201 },
    );
  } catch (err) {
    await updateFunction(fnId, { status: "failed" });
    const message =
      err instanceof Error ? err.message : "Failed to create function";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fns = await getFunctionsByUser(userId);
  return NextResponse.json({ functions: fns });
}
