"use client";

import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";

export function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied to clipboard`);
}

export function DetailRow({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <span className="truncate font-mono text-xs">{value}</span>
        {children}
      </div>
    </div>
  );
}

export function CopyButton({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <button
      onClick={() => copyToClipboard(value, label)}
      className="text-muted-foreground hover:text-foreground shrink-0 p-0.5"
      title={`Copy ${label}`}
    >
      <Copy className="h-3 w-3" />
    </button>
  );
}

export function ConsoleLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-foreground shrink-0 p-0.5"
      title="View in AWS Console"
    >
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
