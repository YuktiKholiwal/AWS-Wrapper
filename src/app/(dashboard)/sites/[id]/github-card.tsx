"use client";

import { useState } from "react";
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
import { GitBranch } from "lucide-react";

interface GitHubCardProps {
  siteId: string;
  githubRepo: string | null;
  githubBranch: string | null;
}

export function GitHubCard({
  siteId,
  githubRepo: initialRepo,
  githubBranch: initialBranch,
}: GitHubCardProps) {
  const [repo, setRepo] = useState(initialRepo);
  const [branch, setBranch] = useState(initialBranch);
  const [repoInput, setRepoInput] = useState("");
  const [branchInput, setBranchInput] = useState("main");
  const [installationId, setInstallationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/sites/${siteId}/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: repoInput,
          branch: branchInput,
          installationId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to connect");
      }

      const data = await res.json();
      setRepo(data.site.githubRepo);
      setBranch(data.site.githubBranch);
      setShowForm(false);
      toast.success("GitHub repo connected! Pushes will auto-deploy.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect this GitHub repo? Auto-deploy will stop.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/github`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to disconnect");
      }
      setRepo(null);
      setBranch(null);
      toast.success("GitHub repo disconnected.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to disconnect",
      );
    } finally {
      setLoading(false);
    }
  }

  if (repo && branch) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              <CardTitle className="text-base">Auto-deploy</CardTitle>
            </div>
            <Badge variant="default">Connected</Badge>
          </div>
          <CardDescription>
            Pushes to <span className="font-mono font-medium">{branch}</span>{" "}
            on{" "}
            <a
              href={`https://github.com/${repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {repo}
            </a>{" "}
            will auto-deploy this site.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleDisconnect}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Disconnecting..." : "Disconnect repo"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!showForm) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            <CardTitle className="text-base">Auto-deploy</CardTitle>
          </div>
          <CardDescription>
            Connect a GitHub repo to auto-deploy on every push.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => setShowForm(true)}
            className="w-full"
          >
            Connect GitHub repo
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          <CardTitle className="text-base">Connect GitHub repo</CardTitle>
        </div>
        <CardDescription>
          First,{" "}
          <a
            href="https://github.com/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            install the Plot GitHub App
          </a>{" "}
          on your repo. Then enter the details below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleConnect} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="repo">Repository</Label>
            <Input
              id="repo"
              placeholder="owner/repo"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch">Branch</Label>
            <Input
              id="branch"
              value={branchInput}
              onChange={(e) => setBranchInput(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="installationId">Installation ID</Label>
            <Input
              id="installationId"
              placeholder="From the GitHub App redirect URL"
              value={installationId}
              onChange={(e) => setInstallationId(e.target.value)}
              required
            />
            <p className="text-muted-foreground text-xs">
              After installing the GitHub App, you&apos;ll be redirected with
              an installation ID in the URL.
            </p>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Connecting..." : "Connect"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
