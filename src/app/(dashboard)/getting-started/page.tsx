import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { getSitesByUser } from "@/lib/db/queries/sites";
import { GettingStartedChecklist } from "./checklist";

export default async function GettingStartedPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const connection = await getAwsConnection(userId);
  const sites = connection ? await getSitesByUser(userId) : [];
  const hasLiveSite = sites.some((s) => s.status === "live");
  const hasDomain = sites.some((s) => s.domainStatus === "active");
  const hasGithub = sites.some((s) => s.githubRepo);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-2 text-2xl font-semibold">Getting Started</h1>
      <p className="text-muted-foreground mb-8 text-sm">
        Follow these steps to deploy your first site. Each step takes just
        a few minutes.
      </p>
      <GettingStartedChecklist
        isConnected={!!connection}
        hasLiveSite={hasLiveSite}
        hasDomain={hasDomain}
        hasGithub={hasGithub}
      />
    </div>
  );
}
