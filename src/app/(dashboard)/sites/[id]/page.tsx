import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { getSite } from "@/lib/db/queries/sites";
import { getDeploymentsBySite } from "@/lib/db/queries/deployments";
import { SiteDetail } from "./site-detail";
import { DeployStatus } from "./deploy-status";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SiteDetailPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const connection = await getAwsConnection(userId);
  if (!connection) redirect("/connect");

  const { id } = await params;
  const site = await getSite(id, userId);
  if (!site) redirect("/sites");

  const deployments = await getDeploymentsBySite(site.id);

  if (site.status === "provisioning" || site.status === "pending") {
    return (
      <div className="mx-auto w-full max-w-lg">
        <DeployStatus siteId={site.id} siteName={site.name} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <SiteDetail site={site} deployments={deployments} />
    </div>
  );
}
