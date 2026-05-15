import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { env } from "@/lib/env";
import { verifyWebhookSignature, downloadRepo } from "@/lib/github/client";
import { getSiteByGithubRepo } from "@/lib/db/queries/sites";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { createDeployment, updateDeployment } from "@/lib/db/queries/deployments";
import { assumeRole } from "@/lib/aws/assume-role";
import { uploadFiles } from "@/lib/aws/s3-sync";
import { invalidateDistribution } from "@/lib/aws/cloudfront";

const generateId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 12);

interface PushPayload {
  ref: string;
  repository: {
    full_name: string;
  };
  head_commit?: {
    id: string;
    message: string;
  };
  installation?: {
    id: number;
  };
}

export async function POST(request: Request) {
  if (!env.GITHUB_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "GitHub webhook not configured" },
      { status: 500 },
    );
  }

  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";

  if (!verifyWebhookSignature(body, signature, env.GITHUB_WEBHOOK_SECRET)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 },
    );
  }

  const event = request.headers.get("x-github-event");
  if (event !== "push") {
    return NextResponse.json({ message: "Event ignored" });
  }

  const payload: PushPayload = JSON.parse(body);
  const repo = payload.repository.full_name;
  const branch = payload.ref.replace("refs/heads/", "");

  const site = await getSiteByGithubRepo(repo, branch);
  if (!site) {
    return NextResponse.json({ message: "No site linked to this repo" });
  }

  if (site.status !== "live" || !site.bucketName || !site.distributionId) {
    return NextResponse.json({ message: "Site not ready for deployment" });
  }

  const connection = await getAwsConnection(site.userId);
  if (!connection) {
    return NextResponse.json(
      { error: "No AWS connection for site owner" },
      { status: 422 },
    );
  }

  const deploymentId = generateId();
  await createDeployment({
    id: deploymentId,
    siteId: site.id,
    status: "deploying",
    source: "github",
    commitSha: payload.head_commit?.id ?? null,
    commitMessage: payload.head_commit?.message ?? null,
  });

  try {
    const [owner, repoName] = repo.split("/");
    const installationId = site.githubInstallationId;
    if (!installationId) {
      throw new Error("No GitHub installation ID");
    }

    const files = await downloadRepo(installationId, owner, repoName, branch);

    const credentials = await assumeRole(
      connection.roleArn,
      connection.externalId,
    );

    await uploadFiles(credentials, connection.region, site.bucketName, files);
    await invalidateDistribution(
      credentials,
      connection.region,
      site.distributionId,
    );

    await updateDeployment(deploymentId, {
      status: "live",
      fileCount: files.length,
      finishedAt: new Date(),
    });

    return NextResponse.json({ message: "Deployed", deploymentId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Deployment failed";

    await updateDeployment(deploymentId, {
      status: "failed",
      errorMessage: message,
      finishedAt: new Date(),
    });

    return NextResponse.json({ error: message }, { status: 422 });
  }
}
