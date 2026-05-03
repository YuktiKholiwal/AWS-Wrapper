"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ConnectFormProps {
  quickCreateUrl: string;
  externalId: string;
}

export function ConnectForm({ quickCreateUrl, externalId }: ConnectFormProps) {
  const router = useRouter();
  const [roleArn, setRoleArn] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/aws/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleArn, region, externalId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Connection failed");
        return;
      }

      router.push("/sites");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="mb-6 text-2xl font-semibold">Connect AWS Account</h1>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Step 1</CardTitle>
            <CardDescription>
              Install the Plot IAM role in your AWS account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href={quickCreateUrl} target="_blank" rel="noopener noreferrer">
              <Button className="w-full">Open AWS CloudFormation</Button>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 2</CardTitle>
            <CardDescription>
              In AWS, check &quot;I acknowledge that AWS CloudFormation might
              create IAM resources&quot; and click &quot;Create stack&quot;.
              Wait for the stack to finish.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 3</CardTitle>
            <CardDescription>
              Copy the Role ARN from the stack Outputs tab and paste it below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roleArn">Role ARN</Label>
                <Input
                  id="roleArn"
                  placeholder="arn:aws:iam::123456789012:role/plot-cross-account-..."
                  value={roleArn}
                  onChange={(e) => setRoleArn(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">AWS Region</Label>
                <Input
                  id="region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Connecting..." : "Connect"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
