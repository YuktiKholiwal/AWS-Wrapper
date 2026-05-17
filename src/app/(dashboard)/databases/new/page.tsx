"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { ArrowLeft } from "lucide-react";

export default function NewDatabasePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create database");
      }

      const data = await res.json();
      toast.success("Database created! Setting up...");
      router.push(`/databases/${data.database.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <Link
        href="/databases"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to databases
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">New Database</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Database name</CardTitle>
          <CardDescription>
            Creates a DynamoDB table in your account. Pay-per-request
            pricing — you only pay for what you use.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="my-data"
                value={name}
                onChange={(e) => setName(e.target.value)}
                pattern="^[a-z0-9][a-z0-9-]*[a-z0-9]$"
                required
              />
              <p className="text-muted-foreground text-xs">
                Lowercase letters, numbers, and hyphens only.
              </p>
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Database"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">What you get</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            A DynamoDB table with a flexible key structure (pk + sk) that
            works for most use cases: user data, app state, config, logs.
          </p>
          <p>
            Use it from your Lambda functions by reading the table name
            from environment variables.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
