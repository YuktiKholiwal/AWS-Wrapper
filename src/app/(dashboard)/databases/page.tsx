import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { getDatabasesByUser } from "@/lib/db/queries/databases";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Database, Plus } from "lucide-react";

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

export default async function DatabasesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const connection = await getAwsConnection(userId);
  if (!connection) redirect("/connect");

  const databases = await getDatabasesByUser(userId);

  if (databases.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Database className="text-muted-foreground mb-4 h-12 w-12" />
        <h1 className="text-xl font-semibold">No databases yet</h1>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm">
          Create a database to store data for your functions.
          One-click DynamoDB in your account.
        </p>
        <Link
          href="/databases/new"
          className={cn(buttonVariants(), "mt-6")}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Database
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Databases</h1>
        <Link href="/databases/new" className={cn(buttonVariants())}>
          <Plus className="mr-2 h-4 w-4" />
          New Database
        </Link>
      </div>
      <div className="space-y-4">
        {databases.map((db) => (
          <Link
            key={db.id}
            href={`/databases/${db.id}`}
            className="block"
          >
            <Card className="cursor-pointer transition-colors duration-150 hover:border-foreground/20 hover:bg-muted/60">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{db.name}</CardTitle>
                  <Badge variant={statusVariant[db.status] ?? "secondary"}>
                    {db.status}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {db.tableName ? (
                    <span className="font-mono">{db.tableName}</span>
                  ) : (
                    "Setting up..."
                  )}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
