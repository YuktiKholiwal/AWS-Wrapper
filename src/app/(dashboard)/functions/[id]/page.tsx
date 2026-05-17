import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { getFunction } from "@/lib/db/queries/functions";
import { FunctionEditor } from "./function-editor";
import { FunctionProvisioningStatus } from "./function-status";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FunctionDetailPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const connection = await getAwsConnection(userId);
  if (!connection) redirect("/connect");

  const { id } = await params;
  const fn = await getFunction(id, userId);
  if (!fn) redirect("/functions");

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        href="/functions"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to functions
      </Link>

      {fn.status === "provisioning" || fn.status === "pending" ? (
        <FunctionProvisioningStatus
          functionId={fn.id}
          functionName={fn.name}
        />
      ) : (
        <FunctionEditor
          fn={{
            id: fn.id,
            name: fn.name,
            code: fn.code,
            status: fn.status,
            apiEndpoint: fn.apiEndpoint,
            runtime: fn.runtime,
          }}
        />
      )}
    </div>
  );
}
