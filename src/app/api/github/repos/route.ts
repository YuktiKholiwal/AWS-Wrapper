import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { App } from "octokit";
import { env } from "@/lib/env";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const installationId = url.searchParams.get("installation_id");
  if (!installationId) {
    return NextResponse.json(
      { error: "Missing installation_id" },
      { status: 400 },
    );
  }

  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
    return NextResponse.json(
      { error: "GitHub App not configured" },
      { status: 500 },
    );
  }

  try {
    const privateKey = Buffer.from(
      env.GITHUB_APP_PRIVATE_KEY,
      "base64",
    ).toString("utf-8");

    const app = new App({
      appId: env.GITHUB_APP_ID,
      privateKey,
    });

    const octokit = await app.getInstallationOctokit(
      Number(installationId),
    );

    const { data } = await octokit.rest.apps.listReposAccessibleToInstallation(
      { per_page: 100 },
    );

    const repos = data.repositories.map((r) => ({
      fullName: r.full_name,
      defaultBranch: r.default_branch,
    }));

    return NextResponse.json({ repos });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch repos";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
