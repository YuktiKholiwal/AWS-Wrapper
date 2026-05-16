import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { getFunctionsByUser } from "@/lib/db/queries/functions";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Plus, Zap } from "lucide-react";

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

export default async function FunctionsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const connection = await getAwsConnection(userId);
  if (!connection) redirect("/connect");

  const functions = await getFunctionsByUser(userId);

  if (functions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Zap className="text-muted-foreground mb-4 h-12 w-12" />
        <h1 className="text-xl font-semibold">No functions yet</h1>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm">
          Create serverless API endpoints that run in your AWS account.
          No servers to manage.
        </p>
        <Link
          href="/functions/new"
          className={cn(buttonVariants(), "mt-6")}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Function
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Functions</h1>
        <Link href="/functions/new" className={cn(buttonVariants())}>
          <Plus className="mr-2 h-4 w-4" />
          New Function
        </Link>
      </div>
      <div className="space-y-4">
        {functions.map((fn) => (
          <Link
            key={fn.id}
            href={`/functions/${fn.id}`}
            className="block"
          >
            <Card className="cursor-pointer transition-colors duration-150 hover:border-foreground/20 hover:bg-muted/60">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{fn.name}</CardTitle>
                  <Badge variant={statusVariant[fn.status] ?? "secondary"}>
                    {fn.status}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {fn.apiEndpoint ? (
                    <span className="font-mono">{fn.apiEndpoint}</span>
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
