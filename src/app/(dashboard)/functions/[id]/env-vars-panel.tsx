"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface EnvVarsPanelProps {
  functionId: string;
  initialVars: Record<string, string>;
  isLive: boolean;
}

export function EnvVarsPanel({
  functionId,
  initialVars,
  isLive,
}: EnvVarsPanelProps) {
  const [vars, setVars] = useState<Array<{ key: string; value: string }>>(
    Object.entries(initialVars).map(([key, value]) => ({ key, value })),
  );
  const [saving, setSaving] = useState(false);

  function addVar() {
    setVars([...vars, { key: "", value: "" }]);
  }

  function removeVar(index: number) {
    setVars(vars.filter((_, i) => i !== index));
  }

  function updateVar(index: number, field: "key" | "value", val: string) {
    const updated = [...vars];
    updated[index] = { ...updated[index], [field]: val };
    setVars(updated);
  }

  async function handleSave() {
    const envVars: Record<string, string> = {};
    for (const v of vars) {
      if (v.key.trim()) {
        envVars[v.key.trim()] = v.value;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/functions/${functionId}/env`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ envVars }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }

      toast.success("Environment variables saved!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Environment variables</CardTitle>
        <CardDescription>
          Set config values your function can read at runtime.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {vars.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="KEY"
              value={v.key}
              onChange={(e) => updateVar(i, "key", e.target.value)}
              className="flex-1 font-mono text-xs"
            />
            <Input
              placeholder="value"
              value={v.value}
              onChange={(e) => updateVar(i, "value", e.target.value)}
              className="flex-1 font-mono text-xs"
            />
            <button
              onClick={() => removeVar(i)}
              className="text-muted-foreground hover:text-destructive shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addVar}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add variable
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || !isLive}
          className="w-full"
        >
          {saving ? "Saving..." : "Save variables"}
        </Button>
      </CardContent>
    </Card>
  );
}
