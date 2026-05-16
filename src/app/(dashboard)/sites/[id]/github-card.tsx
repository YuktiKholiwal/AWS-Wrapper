"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { GitBranch, Loader2 } from "lucide-react";

interface GitHubCardProps {
  siteId: string;
  githubRepo: string | null;
  githubBranch: string | null;
  appSlug: string | null;
}

interface RepoOption {
  fullName: string;
  defaultBranch: string;
}

export function GitHubCard({
  siteId,
  githubRepo: initialRepo,
  githubBranch: initialBranch,
  appSlug,
}: GitHubCardProps) {
  const searchParams = useSearchParams();
  const [repo, setRepo] = useState(initialRepo);
  const [branch, setBranch] = useState(initialBranch);
  const [loading, setLoading] = useState(false);
  const [repos, setRepos] = useState<RepoOption[]>([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [installationId, setInstallationId] = useState<string | null>(null);

  const fetchRepos = useCallback(async (instId: string) => {
    setFetchingRepos(true);
    try {
      const res = await fetch(
        `/api/github/repos?installation_id=${instId}`,
      );
      if (!res.ok) throw new Error("Failed to fetch repos");
      const data = await res.json();
      setRepos(data.repos);
      if (data.repos.length === 1) {
        setSelectedRepo(data.repos[0].fullName);
        setSelectedBranch(data.repos[0].defaultBranch);
      }
    } catch {
      toast.error("Could not load your repositories. Please try again.");
    } finally {
      setFetchingRepos(false);
    }
  }, []);

  useEffect(() => {
    const ghInstId = searchParams.get("github_installation_id");
    if (ghInstId && !repo) {
      setInstallationId(ghInstId);
      fetchRepos(ghInstId);
    }
  }, [searchParams, repo, fetchRepos]);

  async function handleConnect() {
    if (!selectedRepo || !installationId) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/sites/${siteId}/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: selectedRepo,
          branch: selectedBranch,
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
      toast.success("GitHub connected! Pushes will auto-deploy your site.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to connect",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect this repo? Auto-deploy will stop.")) return;
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
      setInstallationId(null);
      setRepos([]);
      toast.success("Repo disconnected.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to disconnect",
      );
    } finally {
      setLoading(false);
    }
  }

  // Connected state
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
            Pushes to{" "}
            <span className="font-mono font-medium">{branch}</span> on{" "}
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

  // Picking a repo after GitHub redirect
  if (installationId && repos.length > 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            <CardTitle className="text-base">Pick a repository</CardTitle>
          </div>
          <CardDescription>
            Choose which repo to deploy from.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {repos.map((r) => (
              <button
                key={r.fullName}
                onClick={() => {
                  setSelectedRepo(r.fullName);
                  setSelectedBranch(r.defaultBranch);
                }}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  selectedRepo === r.fullName
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-foreground/20 hover:bg-muted/60"
                }`}
              >
                <span className="font-medium">{r.fullName}</span>
                <span className="text-muted-foreground ml-2 text-xs">
                  ({r.defaultBranch})
                </span>
              </button>
            ))}
          </div>
          <Button
            onClick={handleConnect}
            disabled={!selectedRepo || loading}
            className="w-full"
          >
            {loading ? "Connecting..." : "Connect and enable auto-deploy"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Loading repos
  if (fetchingRepos) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          <span className="text-muted-foreground ml-2 text-sm">
            Loading your repositories...
          </span>
        </CardContent>
      </Card>
    );
  }

  // Initial state — not connected
  const installUrl = appSlug
    ? `https://github.com/apps/${appSlug}/installations/new?state=${siteId}`
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          <CardTitle className="text-base">Auto-deploy</CardTitle>
        </div>
        <CardDescription>
          Connect a GitHub repo to auto-deploy on every push. No manual
          uploads needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {installUrl ? (
          <a href={installUrl}>
            <Button variant="outline" className="w-full">
              Connect GitHub repo
            </Button>
          </a>
        ) : (
          <p className="text-muted-foreground text-sm">
            GitHub integration is not configured yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
