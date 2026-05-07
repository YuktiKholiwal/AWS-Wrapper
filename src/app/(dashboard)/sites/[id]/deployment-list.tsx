"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Deployment } from "@/lib/db/queries/deployments";

interface DeploymentListProps {
  deployments: Deployment[];
}

export function DeploymentList({ deployments }: DeploymentListProps) {
  if (deployments.length === 0) return null;

  return (
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
  );
}
