"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { copyToClipboard } from "./detail-helpers";
import { Copy } from "lucide-react";

interface DomainCardProps {
  siteId: string;
  customDomain: string | null;
  domainStatus: string;
  cloudfrontUrl: string | null;
  validationCname: string | null;
  validationValue: string | null;
}

export function DomainCard({
  siteId,
  customDomain,
  domainStatus: initialStatus,
  cloudfrontUrl,
  validationCname: initialCname,
  validationValue: initialValue,
}: DomainCardProps) {
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [cname, setCname] = useState(initialCname);
  const [cnameValue, setCnameValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/sites/${siteId}/domain`);
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data.site.domainStatus);
      if (data.site.validationCname) setCname(data.site.validationCname);
      if (data.site.validationValue) setCnameValue(data.site.validationValue);
      if (data.site.domainStatus === "active") {
        toast.success("Domain verified and connected!");
      }
    } catch {
      // retry next interval
    }
  }, [siteId]);

  useEffect(() => {
    if (status !== "pending_validation" && status !== "validating") return;
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [status, poll]);

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/sites/${siteId}/domain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to add domain");
      }

      const data = await res.json();
      setStatus(data.site.domainStatus);
      if (data.validationRecord) {
        setCname(data.validationRecord.name);
        setCnameValue(data.validationRecord.value);
      }
      toast.success("Domain added! Follow the steps below to verify it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add domain");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    if (!confirm("Remove this custom domain?")) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/sites/${siteId}/domain`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to remove domain");
      }
      setStatus("none");
      setCname(null);
      setCnameValue(null);
      setDomain("");
      toast.success("Domain removed.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove domain",
      );
    } finally {
      setLoading(false);
    }
  }

  if (status === "none") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom domain</CardTitle>
          <CardDescription>
            Use your own domain instead of the default URL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddDomain} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                placeholder="mysite.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value.toLowerCase())}
                required
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Adding..." : "Add domain"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (status === "pending_validation" || status === "validating") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verify your domain</CardTitle>
          <CardDescription>
            Add this DNS record at your domain provider (Cloudflare, GoDaddy,
            Namecheap, etc.) to prove you own {customDomain}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cname && cnameValue ? (
            <div className="bg-muted space-y-2 rounded-md p-3">
              <div className="text-xs">
                <span className="text-muted-foreground">Type:</span>{" "}
                <span className="font-medium">CNAME</span>
              </div>
              <div className="flex items-start gap-1 text-xs">
                <span className="text-muted-foreground shrink-0">Name:</span>
                <code className="flex-1 break-all">{cname}</code>
                <button
                  onClick={() => copyToClipboard(cname, "CNAME name")}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-start gap-1 text-xs">
                <span className="text-muted-foreground shrink-0">Value:</span>
                <code className="flex-1 break-all">{cnameValue}</code>
                <button
                  onClick={() => copyToClipboard(cnameValue, "CNAME value")}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Loading validation details...
            </p>
          )}
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div className="bg-primary h-full w-1/3 animate-pulse rounded-full" />
          </div>
          <p className="text-muted-foreground text-center text-xs">
            Checking every 10 seconds... This usually takes 5-30 minutes.
          </p>
          <Button
            variant="outline"
            onClick={handleRemove}
            disabled={loading}
            className="w-full"
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === "active") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Custom domain</CardTitle>
            <Badge variant="default">Active</Badge>
          </div>
          <CardDescription>
            <a
              href={`https://${customDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              https://{customDomain}
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted rounded-md p-3">
            <p className="mb-1 text-xs font-medium">
              Point your domain to your site:
            </p>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">CNAME</span>
              <code>{customDomain}</code>
              <span className="text-muted-foreground">&rarr;</span>
              <code className="flex-1 truncate">{cloudfrontUrl}</code>
              <button
                onClick={() =>
                  copyToClipboard(cloudfrontUrl ?? "", "CloudFront URL")
                }
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleRemove}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Removing..." : "Remove domain"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Failed state
  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive text-base">
          Domain verification failed
        </CardTitle>
        <CardDescription>
          The certificate for {customDomain} could not be verified. This
          usually means the DNS record wasn&apos;t created correctly.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          onClick={handleRemove}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Removing..." : "Try again"}
        </Button>
      </CardContent>
    </Card>
  );
}
