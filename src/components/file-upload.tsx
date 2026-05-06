"use client";

import { useCallback, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface FileEntry {
  file: File;
  relativePath: string;
}

interface FileUploadProps {
  onFilesSelected: (files: FileEntry[]) => void;
  files: FileEntry[];
}

async function readDirectoryEntries(
  entry: FileSystemDirectoryEntry,
  basePath: string,
): Promise<FileEntry[]> {
  const reader = entry.createReader();
  const entries: FileEntry[] = [];

  const readBatch = (): Promise<FileSystemEntry[]> =>
    new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });

  let batch = await readBatch();
  while (batch.length > 0) {
    for (const child of batch) {
      const childPath = basePath ? `${basePath}/${child.name}` : child.name;
      if (child.isFile) {
        const file = await new Promise<File>((resolve, reject) => {
          (child as FileSystemFileEntry).file(resolve, reject);
        });
        entries.push({ file, relativePath: childPath });
      } else if (child.isDirectory) {
        const subEntries = await readDirectoryEntries(
          child as FileSystemDirectoryEntry,
          childPath,
        );
        entries.push(...subEntries);
      }
    }
    batch = await readBatch();
  }

  return entries;
}

export function FileUpload({ onFilesSelected, files }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);

      const items = e.dataTransfer.items;
      const entries: FileEntry[] = [];

      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (!entry) continue;

        if (entry.isDirectory) {
          const dirEntries = await readDirectoryEntries(
            entry as FileSystemDirectoryEntry,
            "",
          );
          entries.push(...dirEntries);
        } else if (entry.isFile) {
          const file = await new Promise<File>((resolve, reject) => {
            (entry as FileSystemFileEntry).file(resolve, reject);
          });
          entries.push({ file, relativePath: file.name });
        }
      }

      onFilesSelected(entries);
    },
    [onFilesSelected],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList) return;

      const entries: FileEntry[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const path = file.webkitRelativePath || file.name;
        const parts = path.split("/");
        const relativePath =
          parts.length > 1 ? parts.slice(1).join("/") : path;
        entries.push({ file, relativePath });
      }

      onFilesSelected(entries);
    },
    [onFilesSelected],
  );

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <Card
        className={`border-2 border-dashed transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Upload className="text-muted-foreground mb-3 h-8 w-8" />
          <p className="text-muted-foreground mb-3 text-sm">
            Drag and drop a folder here
          </p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleInputChange}
            {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
            multiple
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            Or select a folder
          </Button>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <div className="text-muted-foreground text-sm">
          <p className="font-medium">
            {files.length} file{files.length !== 1 ? "s" : ""} selected (
            {formatSize(totalSize)})
          </p>
          <ul className="mt-1 max-h-32 overflow-y-auto font-mono text-xs">
            {files.slice(0, 20).map((f) => (
              <li key={f.relativePath} className="truncate">
                {f.relativePath}
              </li>
            ))}
            {files.length > 20 && (
              <li>...and {files.length - 20} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
