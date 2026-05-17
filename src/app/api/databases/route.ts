import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import {
  createDatabase,
  getDatabasesByUser,
  updateDatabase,
} from "@/lib/db/queries/databases";
import { assumeRole } from "@/lib/aws/assume-role";
import { deployStack } from "@/lib/aws/cloudformation";
import { dynamoDbTableTemplate } from "@/lib/aws/templates/dynamodb-table";

const generateId = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  12,
);

const createDatabaseSchema = z.object({
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
  const parsed = createDatabaseSchema.safeParse(body);
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

  const dbId = generateId();
  const stackName = `plot-db-${dbId}`;

  const database = await createDatabase({
    id: dbId,
    userId,
    name: parsed.data.name,
    stackName,
  });

  try {
    const credentials = await assumeRole(
      connection.roleArn,
      connection.externalId,
    );

    await deployStack(
      credentials,
      connection.region,
      stackName,
      dynamoDbTableTemplate,
      { TableName: dbId },
    );

    await updateDatabase(dbId, { status: "provisioning" });

    return NextResponse.json(
      { database: { ...database, status: "provisioning" } },
      { status: 201 },
    );
  } catch (err) {
    await updateDatabase(dbId, { status: "failed" });
    const message =
      err instanceof Error ? err.message : "Failed to create database";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbs = await getDatabasesByUser(userId);
  return NextResponse.json({ databases: dbs });
}
