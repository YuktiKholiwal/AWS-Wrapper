import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { getSite, updateSite, deleteSite } from "@/lib/db/queries/sites";
import { assumeRole } from "@/lib/aws/assume-role";
import { getStackStatus } from "@/lib/aws/cloudformation";
import { deleteStack } from "@/lib/aws/cloudformation";
import { emptyBucket } from "@/lib/aws/s3-sync";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const site = await getSite(id, userId);
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  if (site.status === "provisioning") {
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
          site.stackName,
        );

        if (
          stackResult.status === "CREATE_COMPLETE" &&
          stackResult.outputs
        ) {
          const updated = await updateSite(site.id, {
            status: "live",
            bucketName: stackResult.outputs.bucketName,
            distributionId: stackResult.outputs.distributionId,
            cloudfrontUrl: stackResult.outputs.distributionDomainName,
          });
          return NextResponse.json({ site: updated });
        }

        if (
          stackResult.status === "CREATE_FAILED" ||
          stackResult.status === "ROLLBACK_COMPLETE"
        ) {
          const updated = await updateSite(site.id, { status: "failed" });
          return NextResponse.json({ site: updated });
        }
      } catch {
        // Stack check failed — return current DB state
      }
    }
  }

  return NextResponse.json({ site });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const site = await getSite(id, userId);
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  await updateSite(site.id, { status: "deleting" });

  const connection = await getAwsConnection(userId);
  if (connection) {
    try {
      const credentials = await assumeRole(
        connection.roleArn,
        connection.externalId,
      );

      if (site.bucketName) {
        await emptyBucket(credentials, connection.region, site.bucketName);
      }

      await deleteStack(credentials, connection.region, site.stackName);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete stack";
      return NextResponse.json({ error: message }, { status: 422 });
    }
  }

  await deleteSite(site.id);
  return NextResponse.json({ success: true });
}
