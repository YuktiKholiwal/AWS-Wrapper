"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DeployStatusProps {
  siteId: string;
  siteName: string;
}

export function DeployStatus({ siteId, siteName }: DeployStatusProps) {
  const router = useRouter();
  const [status, setStatus] = useState("provisioning");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sites/${siteId}`);
        if (!res.ok) return;

        const data = await res.json();
        setStatus(data.site.status);

        if (data.site.status === "live" || data.site.status === "failed") {
          clearInterval(interval);
          router.refresh();
        }
      } catch {
        // retry on next interval
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [siteId, router]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return mins > 0
      ? `${mins}m ${secs.toString().padStart(2, "0")}s`
      : `${secs}s`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{siteName}</CardTitle>
        <CardDescription>
          {status === "provisioning"
            ? "Creating S3 bucket and CloudFront distribution..."
            : status === "pending"
              ? "Preparing deployment..."
              : status === "failed"
                ? "Deployment failed"
                : "Infrastructure is ready!"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              status === "failed" ? "bg-destructive w-full" : "bg-primary w-1/2 animate-pulse"
            }`}
          />
        </div>
        <p className="text-muted-foreground text-center text-xs">
          {status === "failed"
            ? "Check AWS CloudFormation for details."
            : `This usually takes 5-15 minutes. Elapsed: ${formatTime(elapsed)}`}
        </p>
      </CardContent>
    </Card>
  );
}
