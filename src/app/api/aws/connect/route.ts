import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { assumeRole, verifyConnection } from "@/lib/aws/assume-role";
import { upsertAwsConnection } from "@/lib/db/queries/aws-connections";

const connectSchema = z.object({
  roleArn: z
    .string()
    .regex(/^arn:aws:iam::\d{12}:role\/.+$/, "Invalid IAM role ARN format"),
  region: z.string().regex(/^[a-z]{2}-[a-z]+-\d$/, "Invalid AWS region format"),
  externalId: z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      "Invalid external ID format",
    ),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = connectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const { roleArn, region, externalId } = parsed.data;

  try {
    const credentials = await assumeRole(roleArn, externalId);
    const awsAccountId = await verifyConnection(credentials);

    const connection = await upsertAwsConnection({
      userId,
      roleArn,
      externalId,
      awsAccountId,
      region,
    });

    return NextResponse.json({ connection });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to connect AWS account";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
