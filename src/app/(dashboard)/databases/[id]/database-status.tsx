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

interface Props {
  databaseId: string;
  databaseName: string;
}

export function DatabaseProvisioningStatus({
  databaseId,
  databaseName,
}: Props) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/databases/${databaseId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (
          data.database.status === "live" ||
          data.database.status === "failed"
        ) {
          clearInterval(interval);
          router.refresh();
        }
      } catch {
        // retry
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [databaseId, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{databaseName}</CardTitle>
        <CardDescription>Creating your database...</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div className="bg-primary h-full w-1/2 animate-pulse rounded-full" />
        </div>
        <p className="text-muted-foreground text-center text-xs">
          This usually takes less than a minute. Elapsed: {elapsed}s
        </p>
      </CardContent>
    </Card>
  );
}
