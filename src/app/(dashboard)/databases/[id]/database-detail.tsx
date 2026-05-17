"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Copy, Trash2 } from "lucide-react";
import type { Database } from "@/lib/db/queries/databases";

interface Props {
  database: Database;
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied!`);
}

export function DatabaseDetail({ database }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        "Delete this database? All data will be permanently lost.",
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/databases/${database.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Delete failed");
      }
      toast.success("Database deleted.");
      router.push("/databases");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Delete failed",
      );
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{database.name}</CardTitle>
            <Badge
              variant={
                database.status === "live" ? "default" : "destructive"
              }
            >
              {database.status}
            </Badge>
          </div>
          <CardDescription>DynamoDB table in your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {database.tableName && (
            <Detail label="Table name" value={database.tableName}>
              <button
                onClick={() =>
                  copyToClipboard(database.tableName!, "Table name")
                }
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3 w-3" />
              </button>
            </Detail>
          )}
          {database.region && (
            <Detail label="Region" value={database.region} />
          )}
          {database.tableArn && (
            <Detail label="ARN" value={database.tableArn}>
              <button
                onClick={() =>
                  copyToClipboard(database.tableArn!, "ARN")
                }
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3 w-3" />
              </button>
            </Detail>
          )}
        </CardContent>
      </Card>

      {database.status === "live" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Use with your functions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Add the table name as an environment variable in your
              function, then use the AWS SDK to read/write data:
            </p>
            <div className="bg-muted rounded-md p-3">
              <pre className="overflow-x-auto font-mono text-xs">
{`import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const TABLE = process.env.TABLE_NAME;

// Write
await client.send(new PutCommand({
  TableName: TABLE,
  Item: { pk: "user-1", sk: "profile", name: "Alice" }
}));

// Read
const { Item } = await client.send(new GetCommand({
  TableName: TABLE,
  Key: { pk: "user-1", sk: "profile" }
}));`}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {database.status === "failed" && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive text-base">
              Something went wrong
            </CardTitle>
            <CardDescription>
              The database couldn&apos;t be created. Try again with a
              different name, or check that your account connection is
              active.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Button
        variant="destructive"
        onClick={handleDelete}
        disabled={deleting}
        className="w-full"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {deleting ? "Deleting..." : "Delete Database"}
      </Button>
    </div>
  );
}

function Detail({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <span className="truncate font-mono text-xs">{value}</span>
        {children}
      </div>
    </div>
  );
}
