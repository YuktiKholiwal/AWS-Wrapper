import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: Request) {
  const { userId } = await auth();
  const url = new URL(request.url);
  const installationId = url.searchParams.get("installation_id");
  const siteId = url.searchParams.get("state");

  if (installationId && siteId && userId) {
    return NextResponse.redirect(
      new URL(
        `/sites/${siteId}?github_installation_id=${installationId}`,
        url.origin,
      ),
    );
  }

  return NextResponse.redirect(new URL("/sites", url.origin));
}
