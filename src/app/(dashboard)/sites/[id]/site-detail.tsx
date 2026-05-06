"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Redeploy failed");
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
      router.push("/sites");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

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
          <Detail label="Stack" value={site.stackName} />
          {site.bucketName && (
            <Detail label="Bucket" value={site.bucketName} />
          )}
          {site.distributionId && (
            <Detail label="Distribution" value={site.distributionId} />
          )}
        </CardContent>
      </Card>

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

      {deployments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deployments</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {deployments.map((dep) => (
                <li
                  key={dep.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground font-mono text-xs">
                    {dep.startedAt.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2">
                    {dep.fileCount && (
                      <span className="text-muted-foreground text-xs">
                        {dep.fileCount} files
                      </span>
                    )}
                    <Badge
                      variant={
                        dep.status === "live" ? "default" : "destructive"
                      }
                    >
                      {dep.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}
