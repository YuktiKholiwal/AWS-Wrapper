"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
        const msg = data.error ?? "Connection failed";
        setError(
          msg.includes("Access denied") || msg.includes("AssumeRole")
            ? "Could not connect. Make sure the setup finished (status shows CREATE_COMPLETE) and that you copied the correct value from the Outputs tab."
            : msg.includes("ExternalId")
              ? "This connection code doesn't match. Go back to AWS, delete the previous setup, refresh this page, and try again from Step 1."
              : msg,
        );
        return;
      }

      toast.success("Account connected!");
      router.push("/sites");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="mb-6 text-2xl font-semibold">Connect Your Account</h1>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Open the setup page</CardTitle>
            <CardDescription>
              This opens a page in your AWS account that creates a secure
              link between your account and Plot. You won&apos;t be charged
              for this.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href={quickCreateUrl} target="_blank" rel="noopener noreferrer">
              <Button className="w-full">Open setup page in AWS</Button>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 2: Approve the setup</CardTitle>
            <CardDescription>
              On the page that opened, follow these steps:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="text-muted-foreground list-inside list-decimal space-y-2 text-sm">
              <li>Scroll to the bottom of the page</li>
              <li>
                Check the box that says{" "}
                <span className="text-foreground font-medium">
                  &quot;I acknowledge...&quot;
                </span>
              </li>
              <li>
                Click the orange{" "}
                <span className="text-foreground font-medium">
                  &quot;Create stack&quot;
                </span>{" "}
                button
              </li>
              <li>
                Wait until the status shows{" "}
                <span className="text-foreground font-medium">
                  CREATE_COMPLETE
                </span>{" "}
                (about 1-2 minutes)
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 3: Paste your connection code</CardTitle>
            <CardDescription>
              Once the status says CREATE_COMPLETE: click the{" "}
              <span className="text-foreground font-medium">Outputs</span>{" "}
              tab, copy the value next to{" "}
              <span className="text-foreground font-medium">RoleArn</span>,
              and paste it below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roleArn">Connection code</Label>
                <Input
                  id="roleArn"
                  placeholder="Paste the value from the Outputs tab"
                  value={roleArn}
                  onChange={(e) => setRoleArn(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
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
