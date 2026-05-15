import { App } from "octokit";
import crypto from "crypto";
import { env } from "@/lib/env";
import { detectContentType } from "@/lib/aws/s3-sync";
import type { UploadFile } from "@/lib/aws/s3-sync";

function getGitHubApp(): App {
  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
    throw new Error("GitHub App is not configured");
  }

  const privateKey = Buffer.from(
    env.GITHUB_APP_PRIVATE_KEY,
    "base64",
  ).toString("utf-8");

  return new App({
    appId: env.GITHUB_APP_ID,
    privateKey,
  });
}

export async function downloadRepo(
  installationId: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<UploadFile[]> {
  const app = getGitHubApp();
  const octokit = await app.getInstallationOctokit(Number(installationId));

  const { data } = await octokit.rest.repos.downloadZipballArchive({
    owner,
    repo,
    ref: branch,
  });

  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(data as ArrayBuffer);

  const files: UploadFile[] = [];
  const entries = Object.entries(zip.files);

  for (const [path, entry] of entries) {
    if (entry.dir) continue;

    const parts = path.split("/");
    const relativePath = parts.slice(1).join("/");

    if (!relativePath) continue;
    if (relativePath.startsWith(".")) continue;
    if (relativePath.includes("/.")) continue;

    const content = await entry.async("uint8array");
    files.push({
      key: relativePath,
      body: Buffer.from(content),
      contentType: detectContentType(relativePath),
    });
  }

  return files;
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")}`;

  if (signature.length !== expected.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  );
}
