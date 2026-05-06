import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { customAlphabet } from "nanoid";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { getSite } from "@/lib/db/queries/sites";
import { createDeployment, updateDeployment } from "@/lib/db/queries/deployments";
import { assumeRole } from "@/lib/aws/assume-role";
import { uploadFiles, detectContentType } from "@/lib/aws/s3-sync";
import { invalidateDistribution } from "@/lib/aws/cloudfront";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const site = await getSite(id, userId);
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  if (site.status !== "live") {
    return NextResponse.json(
      { error: "Site is not ready for uploads" },
      { status: 400 },
    );
  }

  if (!site.bucketName || !site.distributionId) {
    return NextResponse.json(
      { error: "Site infrastructure not ready" },
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

  const formData = await request.formData();
  const files: { key: string; body: Buffer; contentType: string }[] = [];

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      const arrayBuffer = await value.arrayBuffer();
      const filePath = key || value.name;
      files.push({
        key: filePath,
        body: Buffer.from(arrayBuffer),
        contentType: detectContentType(filePath),
      });
    }
  }

  if (files.length === 0) {
    return NextResponse.json(
      { error: "No files provided" },
      { status: 400 },
    );
  }

  const generateId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 12);
  const deploymentId = generateId();
  await createDeployment({
    id: deploymentId,
    siteId: site.id,
    status: "deploying",
    fileCount: files.length,
  });

  try {
    const credentials = await assumeRole(
      connection.roleArn,
      connection.externalId,
    );

    await uploadFiles(
      credentials,
      connection.region,
      site.bucketName,
      files,
    );

    await invalidateDistribution(
      credentials,
      connection.region,
      site.distributionId,
    );

    const updated = await updateDeployment(deploymentId, {
      status: "live",
      finishedAt: new Date(),
    });

    return NextResponse.json({ deployment: updated }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Upload failed";

    await updateDeployment(deploymentId, {
      status: "failed",
      finishedAt: new Date(),
      errorMessage: message,
    });

    return NextResponse.json({ error: message }, { status: 422 });
  }
}
