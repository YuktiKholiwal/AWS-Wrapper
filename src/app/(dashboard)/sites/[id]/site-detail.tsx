"use client";

import { useState, useCallback } from "react";
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
import { FileUpload } from "@/components/file-upload";
import { DeploymentList } from "./deployment-list";
import { DomainCard } from "./domain-card";
import { GitHubCard } from "./github-card";
import {
  copyToClipboard,
  DetailRow,
  CopyButton,
  ConsoleLink,
} from "./detail-helpers";
import { ExternalLink } from "lucide-react";
import type { Site } from "@/lib/db/queries/sites";
import type { Deployment } from "@/lib/db/queries/deployments";

interface FileEntry {
  file: File;
  relativePath: string;
}

interface SiteDetailProps {
  site: Site;
  deployments: Deployment[];
}

export function SiteDetail({ site, deployments }: SiteDetailProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = useCallback((selected: FileEntry[]) => {
    setFiles(selected);
  }, []);

  async function handleRedeploy() {
    if (files.length === 0) return;
    setError(null);
    setUploading(true);

    try {
      const batchSize = 10;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const formData = new FormData();
        for (const entry of batch) {
          formData.append(entry.relativePath, entry.file);
        }

        const res = await fetch(`/api/sites/${site.id}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Upload failed");
        }
      }

      setFiles([]);
      toast.success(
        "Files uploaded! Your site may take a few minutes to update worldwide.",
      );
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Redeploy failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        "Delete this site? This will permanently delete your site and all its files.",
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/sites/${site.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Delete failed");
      }
      toast.success("Site deleted.");
      router.push("/sites");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      toast.error(msg);
      setDeleting(false);
    }
  }

  const siteUrl = site.cloudfrontUrl
    ? `https://${site.cloudfrontUrl}`
    : null;
  const consoleRegion = "us-east-1";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{site.name}</CardTitle>
            <Badge
              variant={site.status === "live" ? "default" : "destructive"}
            >
              {site.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {siteUrl && (
            <div className="flex items-center gap-2">
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
              >
                <ExternalLink className="h-4 w-4" />
                Visit your site
              </a>
              <button
                onClick={() => copyToClipboard(siteUrl, "Site URL")}
                className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-2"
              >
                Copy URL
              </button>
            </div>
          )}

          <details className="text-sm">
            <summary className="text-muted-foreground cursor-pointer select-none hover:text-foreground">
              Technical details
            </summary>
            <div className="mt-3 space-y-2">
              <DetailRow label="Stack" value={site.stackName}>
                <CopyButton value={site.stackName} label="Stack name" />
                <ConsoleLink
                  href={`https://${consoleRegion}.console.aws.amazon.com/cloudformation/home?region=${consoleRegion}#/stacks?filteringText=${site.stackName}`}
                />
              </DetailRow>
              {site.bucketName && (
                <DetailRow label="Bucket" value={site.bucketName}>
                  <CopyButton value={site.bucketName} label="Bucket name" />
                  <ConsoleLink
                    href={`https://s3.console.aws.amazon.com/s3/buckets/${site.bucketName}`}
                  />
                </DetailRow>
              )}
              {site.distributionId && (
                <DetailRow label="Distribution" value={site.distributionId}>
                  <CopyButton
                    value={site.distributionId}
                    label="Distribution ID"
                  />
                  <ConsoleLink
                    href={`https://${consoleRegion}.console.aws.amazon.com/cloudfront/v4/home#/distributions/${site.distributionId}`}
                  />
                </DetailRow>
              )}
            </div>
          </details>
        </CardContent>
      </Card>

      {site.status === "failed" && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive text-base">
              Something went wrong
            </CardTitle>
            <CardDescription>
              Your site couldn&apos;t be set up. Here&apos;s what to try:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="text-muted-foreground list-inside list-decimal space-y-1 text-sm">
              <li>Create a new site with a different name</li>
              <li>
                Make sure your account connection is still active (check the
                Connection page)
              </li>
              <li>
                If this keeps happening, your account may have a service limit
                — try again later
              </li>
            </ol>
          </CardContent>
        </Card>
      )}

      {site.status === "live" && (
        <DomainCard
          siteId={site.id}
          customDomain={site.customDomain}
          domainStatus={site.domainStatus}
          cloudfrontUrl={site.cloudfrontUrl}
          validationCname={site.validationCname}
          validationValue={site.validationValue}
        />
      )}

      {site.status === "live" && (
        <GitHubCard
          siteId={site.id}
          githubRepo={site.githubRepo}
          githubBranch={site.githubBranch}
        />
      )}

      {site.status === "live" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Update your site</CardTitle>
            <CardDescription>
              Upload new files to replace the current version.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <FileUpload
              onFilesSelected={handleFilesSelected}
              files={files}
            />
            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}
            <Button
              onClick={handleRedeploy}
              disabled={files.length === 0 || uploading}
              className="w-full"
            >
              {uploading ? "Uploading..." : "Update site"}
            </Button>
          </CardContent>
        </Card>
      )}

      <DeploymentList deployments={deployments} />

      <Button
        variant="destructive"
        onClick={handleDelete}
        disabled={deleting}
        className="w-full"
      >
        {deleting ? "Deleting..." : "Delete Site"}
      </Button>
    </div>
  );
}
