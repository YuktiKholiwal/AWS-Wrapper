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

interface FunctionProvisioningStatusProps {
  functionId: string;
  functionName: string;
}

export function FunctionProvisioningStatus({
  functionId,
  functionName,
}: FunctionProvisioningStatusProps) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/functions/${functionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (
          data.function.status === "live" ||
          data.function.status === "failed"
        ) {
          clearInterval(interval);
          router.refresh();
        }
      } catch {
        // retry
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [functionId, router]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const time =
    mins > 0
      ? `${mins}m ${secs.toString().padStart(2, "0")}s`
      : `${secs}s`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{functionName}</CardTitle>
        <CardDescription>
          Setting up your function&apos;s infrastructure...
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div className="bg-primary h-full w-1/2 animate-pulse rounded-full" />
        </div>
        <p className="text-muted-foreground text-center text-xs">
          Creating Lambda function and API endpoint. This usually takes
          1-3 minutes. Elapsed: {time}
        </p>
      </CardContent>
    </Card>
  );
}
