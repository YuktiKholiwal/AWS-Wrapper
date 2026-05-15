import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getSite, updateSite } from "@/lib/db/queries/sites";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const connectSchema = z.object({
  repo: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/, "Invalid repo format (owner/repo)"),
  branch: z.string().trim().min(1, "Branch is required"),
  installationId: z.string().trim().min(1, "Installation ID is required"),
});

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
      { error: "Site must be live before connecting GitHub" },
      { status: 400 },
    );
  }

  const body = await request.json();
  const parsed = connectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const { repo, branch, installationId } = parsed.data;

  const updated = await updateSite(site.id, {
    githubRepo: repo,
    githubBranch: branch,
    githubInstallationId: installationId,
  });

  return NextResponse.json({ site: updated });
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

  await updateSite(site.id, {
    githubRepo: null,
    githubBranch: null,
    githubInstallationId: null,
  });

  return NextResponse.json({ success: true });
}
