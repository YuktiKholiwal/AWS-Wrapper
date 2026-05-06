import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import type { AwsTempCredentials } from "@/lib/aws/assume-role";

const CONTENT_TYPE_MAP: Record<string, string> = {
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".json": "application/json",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".pdf": "application/pdf",
  ".map": "application/json",
  ".webmanifest": "application/manifest+json",
};

export function detectContentType(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return CONTENT_TYPE_MAP[ext] ?? "application/octet-stream";
}

function getS3Client(
  credentials: AwsTempCredentials,
  region: string,
): S3Client {
  return new S3Client({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });
}

export interface UploadFile {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}

export async function uploadFiles(
  credentials: AwsTempCredentials,
  region: string,
  bucketName: string,
  files: UploadFile[],
): Promise<void> {
  const client = getS3Client(credentials, region);

  await Promise.all(
    files.map((file) =>
      client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: file.key,
          Body: file.body,
          ContentType: file.contentType,
        }),
      ),
    ),
  );
}

export async function emptyBucket(
  credentials: AwsTempCredentials,
  region: string,
  bucketName: string,
): Promise<void> {
  const client = getS3Client(credentials, region);

  let continuationToken: string | undefined;

  do {
    const listResponse = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      }),
    );

    const objects = listResponse.Contents;
    if (!objects || objects.length === 0) break;

    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: objects.map((obj) => ({ Key: obj.Key })),
          Quiet: true,
        },
      }),
    );

    continuationToken = listResponse.IsTruncated
      ? listResponse.NextContinuationToken
      : undefined;
  } while (continuationToken);
}
