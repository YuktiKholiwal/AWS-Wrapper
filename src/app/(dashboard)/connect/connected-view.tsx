"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AwsConnection } from "@/lib/db/queries/aws-connections";

interface ConnectedViewProps {
  connection: AwsConnection;
}

export function ConnectedView({ connection }: ConnectedViewProps) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch("/api/aws/connection", { method: "DELETE" });
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="mb-6 text-2xl font-semibold">AWS Connection</h1>
      <Card>
        <CardHeader>
          <CardTitle>Connected</CardTitle>
          <CardDescription>Your AWS account is linked to Plot.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Detail label="Account ID" value={connection.awsAccountId} />
          <Detail label="Region" value={connection.region} />
          <Detail label="Role ARN" value={connection.roleArn} />
          <Detail
            label="Connected"
            value={connection.connectedAt.toLocaleDateString()}
          />
          <Button
            variant="destructive"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="mt-4 w-full"
          >
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
