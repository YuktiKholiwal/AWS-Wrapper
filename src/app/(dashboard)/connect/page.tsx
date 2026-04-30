import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { ConnectedView } from "./connected-view";
import { ConnectForm } from "./connect-form";
import { getQuickCreateUrl } from "@/lib/aws/quick-create-url";
import { randomUUID } from "crypto";

export default async function ConnectPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const connection = await getAwsConnection(userId);

  if (connection) {
    return <ConnectedView connection={connection} />;
  }

  const externalId = randomUUID();
  const quickCreateUrl = getQuickCreateUrl(externalId, "us-east-1");

  return <ConnectForm quickCreateUrl={quickCreateUrl} />;
}
