import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { getSitesByUser } from "@/lib/db/queries/sites";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Globe, Plus } from "lucide-react";

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  provisioning: "outline",
  live: "default",
  failed: "destructive",
  deleting: "secondary",
};

export default async function SitesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const connection = await getAwsConnection(userId);
  if (!connection) redirect("/connect");

  const sites = await getSitesByUser(userId);

  if (sites.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Globe className="text-muted-foreground mb-4 h-12 w-12" />
        <h1 className="text-xl font-semibold">No sites yet</h1>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm">
          Deploy your first static site to your AWS account.
        </p>
        <Link
          href="/sites/new"
          className={cn(buttonVariants(), "mt-6")}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Site
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sites</h1>
        <Link
          href="/sites/new"
          className={cn(buttonVariants())}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Site
        </Link>
      </div>
      <div className="space-y-4">
        {sites.map((site) => (
          <Link key={site.id} href={`/sites/${site.id}`} className="block">
            <Card className="cursor-pointer transition-colors duration-150 hover:border-foreground/20 hover:bg-muted/60">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{site.name}</CardTitle>
                  <Badge variant={statusVariant[site.status] ?? "secondary"}>
                    {site.status}
                  </Badge>
                </div>
                <CardDescription className="font-mono text-xs">
                  {site.cloudfrontUrl
                    ? `https://${site.cloudfrontUrl}`
                    : site.stackName}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
