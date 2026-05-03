import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { Globe } from "lucide-react";

export default async function SitesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const connection = await getAwsConnection(userId);
  if (!connection) redirect("/connect");

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <Globe className="text-muted-foreground mb-4 h-12 w-12" />
      <h1 className="text-xl font-semibold">No sites yet</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Deploy your first static site in Phase 2.
      </p>
    </div>
  );
}
