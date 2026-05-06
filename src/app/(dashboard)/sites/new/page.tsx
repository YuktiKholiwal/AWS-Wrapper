import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { NewSiteForm } from "./new-site-form";

export default async function NewSitePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const connection = await getAwsConnection(userId);
  if (!connection) redirect("/connect");

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="mb-6 text-2xl font-semibold">Deploy a new site</h1>
      <NewSiteForm />
    </div>
  );
}
