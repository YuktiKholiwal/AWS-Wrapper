import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { getDatabase } from "@/lib/db/queries/databases";
import { DatabaseDetail } from "./database-detail";
import { DatabaseProvisioningStatus } from "./database-status";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DatabaseDetailPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const connection = await getAwsConnection(userId);
  if (!connection) redirect("/connect");

  const { id } = await params;
  const database = await getDatabase(id, userId);
  if (!database) redirect("/databases");

  return (
    <div className="mx-auto w-full max-w-lg">
      <Link
        href="/databases"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to databases
      </Link>

      {database.status === "provisioning" ||
      database.status === "pending" ? (
        <DatabaseProvisioningStatus
          databaseId={database.id}
          databaseName={database.name}
        />
      ) : (
        <DatabaseDetail database={database} />
      )}
    </div>
  );
}
