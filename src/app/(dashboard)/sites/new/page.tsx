import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { NewSiteForm } from "./new-site-form";

export default async function NewSitePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const connection = await getAwsConnection(userId);
  if (!connection) redirect("/connect");

  return (
    <div className="mx-auto w-full max-w-lg">
      <Link
        href="/sites"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sites
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">Deploy a new site</h1>
      <NewSiteForm />
    </div>
  );
}
