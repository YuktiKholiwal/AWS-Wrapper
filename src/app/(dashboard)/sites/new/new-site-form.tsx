"use client";

import { useState, useCallback } from "react";
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
import { FileUpload } from "@/components/file-upload";

interface FileEntry {
  file: File;
  relativePath: string;
}

type DeployStep = "configure" | "provisioning" | "uploading" | "done";

export function NewSiteForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [step, setStep] = useState<DeployStep>("configure");
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");

  const handleFilesSelected = useCallback((selected: FileEntry[]) => {
    setFiles(selected);
  }, []);

  async function pollSiteStatus(siteId: string): Promise<boolean> {
    const maxAttempts = 120;
    for (let i = 0; i < maxAttempts; i++) {
      const delay = i < 6 ? 5000 : 15000;
      await new Promise((r) => setTimeout(r, delay));

      const res = await fetch(`/api/sites/${siteId}`);
      if (!res.ok) continue;

      const data = await res.json();
      if (data.site.status === "live") return true;
      if (data.site.status === "failed") return false;

      setStatusText(
        `Setting up your site... (${Math.floor((i + 1) * (delay / 1000))}s)`,
      );
    }
    return false;
  }

  async function uploadFiles(siteId: string) {
    const batchSize = 10;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const formData = new FormData();
      for (const entry of batch) {
        formData.append(entry.relativePath, entry.file);
      }

      const res = await fetch(`/api/sites/${siteId}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Upload failed");
      }

      setStatusText(
        `Uploading files... (${Math.min(i + batchSize, files.length)}/${files.length})`,
      );
    }
  }

  async function handleDeploy(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (files.length === 0) {
      setError("Please select files to deploy");
      return;
    }

    try {
      setStep("provisioning");
      setStatusText("Creating site...");

      const createRes = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error ?? "Failed to create site");
      }

      const { site } = await createRes.json();

      setStatusText(
        "Setting up hosting... This usually takes 5-15 minutes.",
      );
      const ready = await pollSiteStatus(site.id);
      if (!ready) {
        throw new Error(
          "Setup failed. Try again with a different site name, or check that your account connection is still active.",
        );
      }

      setStep("uploading");
      setStatusText("Uploading files...");
      await uploadFiles(site.id);

      setStep("done");
      setStatusText("Deployment complete!");
      toast.success("Site deployed successfully!");

      setTimeout(() => router.push(`/sites/${site.id}`), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Deployment failed";
      setError(msg);
      toast.error(msg);
      setStep("configure");
    }
  }

  if (step !== "configure") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {step === "done" ? "Deployed!" : "Deploying..."}
          </CardTitle>
          <CardDescription>{statusText}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}
          {step === "provisioning" && (
            <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
              <div className="bg-primary h-full w-1/3 animate-pulse rounded-full" />
            </div>
          )}
          {step === "uploading" && (
            <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
              <div className="bg-primary h-full w-2/3 animate-pulse rounded-full" />
            </div>
          )}
          {step === "done" && (
            <p className="text-muted-foreground mt-2 text-sm">
              Redirecting to site details...
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleDeploy} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Site name</CardTitle>
          <CardDescription>
            Lowercase letters, numbers, and hyphens only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="name" className="sr-only">
            Site name
          </Label>
          <Input
            id="name"
            placeholder="my-awesome-site"
            value={name}
            onChange={(e) => setName(e.target.value)}
            pattern="^[a-z0-9][a-z0-9-]*[a-z0-9]$"
            required
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Files</CardTitle>
          <CardDescription>
            Select the folder containing your static site (must include
            index.html).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUpload
            onFilesSelected={handleFilesSelected}
            files={files}
          />
        </CardContent>
      </Card>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" className="w-full" disabled={!name || files.length === 0}>
        Deploy
      </Button>
    </form>
  );
}
