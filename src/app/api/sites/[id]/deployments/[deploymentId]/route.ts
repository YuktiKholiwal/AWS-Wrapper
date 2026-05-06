import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSite } from "@/lib/db/queries/sites";
import { getDeployment } from "@/lib/db/queries/deployments";

interface RouteParams {
  params: Promise<{ id: string; deploymentId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, deploymentId } = await params;

  const site = await getSite(id, userId);
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const deployment = await getDeployment(deploymentId, site.id);
  if (!deployment) {
    return NextResponse.json(
      { error: "Deployment not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ deployment });
}
