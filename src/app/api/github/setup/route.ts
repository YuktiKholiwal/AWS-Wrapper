import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const installationId = url.searchParams.get("installation_id");
  const setupAction = url.searchParams.get("setup_action");

  if (setupAction === "install" && installationId) {
    return NextResponse.redirect(
      new URL(`/sites?github_installation_id=${installationId}`, url.origin),
    );
  }

  return NextResponse.redirect(new URL("/sites", url.origin));
}
