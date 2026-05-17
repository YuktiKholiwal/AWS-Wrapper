"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Copy, ExternalLink, Play, Rocket, Trash2 } from "lucide-react";

interface FunctionEditorProps {
  fn: {
    id: string;
    name: string;
    code: string;
    status: string;
    apiEndpoint: string | null;
    runtime: string;
  };
}

export function FunctionEditor({ fn }: FunctionEditorProps) {
  const router = useRouter();
  const [code, setCode] = useState(fn.code);
  const [deploying, setDeploying] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testPayload, setTestPayload] = useState("{}");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showTest, setShowTest] = useState(false);

  async function handleDeploy() {
    setDeploying(true);
    try {
      const res = await fetch(`/api/functions/${fn.id}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Deploy failed");
      }

      toast.success("Code deployed!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/functions/${fn.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: JSON.parse(testPayload) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Test failed");

      setTestResult(
        JSON.stringify(JSON.parse(data.result.body), null, 2),
      );
    } catch (err) {
      setTestResult(
        err instanceof Error ? err.message : "Test failed",
      );
    } finally {
      setTesting(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm("Delete this function? This removes the Lambda and API.")
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/functions/${fn.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Delete failed");
      }
      toast.success("Function deleted.");
      router.push("/functions");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  function copyEndpoint() {
    if (fn.apiEndpoint) {
      navigator.clipboard.writeText(fn.apiEndpoint);
      toast.success("API endpoint copied!");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{fn.name}</CardTitle>
            <Badge
              variant={fn.status === "live" ? "default" : "destructive"}
            >
              {fn.status}
            </Badge>
          </div>
          {fn.apiEndpoint && (
            <CardDescription className="flex items-center gap-2">
              <a
                href={fn.apiEndpoint}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-mono text-xs hover:underline"
              >
                {fn.apiEndpoint}
              </a>
              <button
                onClick={copyEndpoint}
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3 w-3" />
              </button>
              <a
                href={fn.apiEndpoint}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          )}
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="border-b px-4 py-2">
            <span className="text-muted-foreground text-xs">
              index.js — {fn.runtime}
            </span>
          </div>
          <Editor
            height="350px"
            language="javascript"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value ?? "")}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              padding: { top: 12 },
              tabSize: 2,
            }}
          />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          onClick={handleDeploy}
          disabled={deploying || fn.status !== "live"}
          className="flex-1"
        >
          <Rocket className="mr-2 h-4 w-4" />
          {deploying ? "Deploying..." : "Deploy"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowTest(!showTest)}
          disabled={fn.status !== "live"}
        >
          <Play className="mr-2 h-4 w-4" />
          Test
        </Button>
      </div>

      {showTest && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test your function</CardTitle>
            <CardDescription>
              Send a test payload and see the response.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                Request payload (JSON)
              </label>
              <textarea
                className="bg-muted w-full rounded-md p-3 font-mono text-xs"
                rows={3}
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
              />
            </div>
            <Button
              onClick={handleTest}
              disabled={testing}
              variant="outline"
              className="w-full"
            >
              {testing ? "Running..." : "Run test"}
            </Button>
            {testResult && (
              <div>
                <label className="text-muted-foreground mb-1 block text-xs">
                  Response
                </label>
                <pre className="bg-muted max-h-48 overflow-auto rounded-md p-3 font-mono text-xs">
                  {testResult}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Button
        variant="destructive"
        onClick={handleDelete}
        disabled={deleting}
        className="w-full"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {deleting ? "Deleting..." : "Delete Function"}
      </Button>
    </div>
  );
}
