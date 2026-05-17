"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

interface LogEvent {
  timestamp: number;
  message: string;
}

interface LogsPanelProps {
  functionId: string;
  isLive: boolean;
}

export function LogsPanel({ functionId, isLive }: LogsPanelProps) {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await fetch(`/api/functions/${functionId}/logs`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to fetch logs");
      }
      const data = await res.json();
      setLogs(data.logs);
      setFetched(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to fetch logs",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Logs</CardTitle>
            <CardDescription>
              Recent output from your function.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading || !isLive}
          >
            <RefreshCw
              className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!fetched && (
          <p className="text-muted-foreground text-center text-sm">
            Click Refresh to load recent logs.
          </p>
        )}
        {fetched && logs.length === 0 && (
          <p className="text-muted-foreground text-center text-sm">
            No logs yet. Try invoking your function first.
          </p>
        )}
        {logs.length > 0 && (
          <div className="bg-muted max-h-64 overflow-auto rounded-md p-3">
            {logs.map((log, i) => (
              <div key={i} className="font-mono text-xs leading-relaxed">
                <span className="text-muted-foreground mr-2">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
