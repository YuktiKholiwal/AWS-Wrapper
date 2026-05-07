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
import { Copy, ExternalLink } from "lucide-react";
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

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied to clipboard`);
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
      toast.success("Files uploaded! CloudFront may take a few minutes to update.");
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
    if (!confirm("Delete this site? This will remove all AWS resources.")) {
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
          {site.cloudfrontUrl && (
            <CardDescription>
              <a
                href={`https://${site.cloudfrontUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                https://{site.cloudfrontUrl}
              </a>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          <DetailRow label="Stack" value={site.stackName}>
            <CopyButton
              value={site.stackName}
              label="Stack name"
            />
            <ConsoleLink
              href={`https://${consoleRegion}.console.aws.amazon.com/cloudformation/home?region=${consoleRegion}#/stacks?filteringText=${site.stackName}`}
            />
          </DetailRow>
          {site.bucketName && (
            <DetailRow label="Bucket" value={site.bucketName}>
              <CopyButton
                value={site.bucketName}
                label="Bucket name"
              />
              <ConsoleLink
                href={`https://s3.console.aws.amazon.com/s3/buckets/${site.bucketName}`}
              />
            </DetailRow>
          )}
          {site.distributionId && (
            <DetailRow
              label="Distribution"
              value={site.distributionId}
            >
              <CopyButton
                value={site.distributionId}
                label="Distribution ID"
              />
              <ConsoleLink
                href={`https://${consoleRegion}.console.aws.amazon.com/cloudfront/v4/home#/distributions/${site.distributionId}`}
              />
            </DetailRow>
          )}
          {site.cloudfrontUrl && (
            <DetailRow label="URL" value={`https://${site.cloudfrontUrl}`}>
              <CopyButton
                value={`https://${site.cloudfrontUrl}`}
                label="URL"
              />
            </DetailRow>
          )}
        </CardContent>
      </Card>

      {site.status === "failed" && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive text-base">
              Deployment Failed
            </CardTitle>
            <CardDescription>
              The CloudFormation stack failed to create. Check the{" "}
              <a
                href={`https://${consoleRegion}.console.aws.amazon.com/cloudformation/home?region=${consoleRegion}#/stacks?filteringText=${site.stackName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                AWS CloudFormation console
              </a>{" "}
              for details. Common causes: resource name conflicts, permission
              issues, or AWS service limits.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {site.status === "live" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Redeploy</CardTitle>
            <CardDescription>
              Upload new files to replace the current deployment.
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
              {uploading ? "Uploading..." : "Redeploy"}
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

function DetailRow({
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

function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <button
      onClick={() => copyToClipboard(value, label)}
      className="text-muted-foreground hover:text-foreground shrink-0 p-0.5"
      title={`Copy ${label}`}
    >
      <Copy className="h-3 w-3" />
    </button>
  );
}

function ConsoleLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-foreground shrink-0 p-0.5"
      title="Open in AWS Console"
    >
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
