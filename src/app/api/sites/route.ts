import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { createSite, getSitesByUser } from "@/lib/db/queries/sites";
import { assumeRole } from "@/lib/aws/assume-role";
import { deployStack } from "@/lib/aws/cloudformation";
import { staticSiteTemplate } from "@/lib/aws/templates/static-site";
import { updateSite } from "@/lib/db/queries/sites";

const createSiteSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be 50 characters or less")
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      "Name must be lowercase, alphanumeric, and may contain hyphens",
    ),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSiteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const connection = await getAwsConnection(userId);
  if (!connection) {
    return NextResponse.json(
      { error: "No AWS connection found" },
      { status: 400 },
    );
  }

  const generateId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 12);
  const siteId = generateId();
  const stackName = `plot-site-${siteId}`;

  const site = await createSite({
    id: siteId,
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
      staticSiteTemplate,
      { SiteName: siteId },
    );

    await updateSite(siteId, { status: "provisioning" });

    return NextResponse.json(
      { site: { ...site, status: "provisioning" } },
      { status: 201 },
    );
  } catch (err) {
    await updateSite(siteId, { status: "failed" });
    const message =
      err instanceof Error ? err.message : "Failed to create stack";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sites = await getSitesByUser(userId);
  return NextResponse.json({ sites });
}
