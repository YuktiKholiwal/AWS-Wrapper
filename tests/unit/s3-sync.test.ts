import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import {
  uploadFiles,
  emptyBucket,
  detectContentType,
} from "@/lib/aws/s3-sync";

const s3Mock = mockClient(S3Client);

const fakeCreds = {
  accessKeyId: "ASIA_TEST",
  secretAccessKey: "secret",
  sessionToken: "token",
  expiration: new Date(),
};

beforeEach(() => {
  s3Mock.reset();
});

describe("detectContentType", () => {
  it("returns correct type for known extensions", () => {
    expect(detectContentType("index.html")).toBe("text/html");
    expect(detectContentType("styles.css")).toBe("text/css");
    expect(detectContentType("app.js")).toBe("application/javascript");
    expect(detectContentType("data.json")).toBe("application/json");
    expect(detectContentType("logo.svg")).toBe("image/svg+xml");
    expect(detectContentType("photo.png")).toBe("image/png");
    expect(detectContentType("photo.jpg")).toBe("image/jpeg");
    expect(detectContentType("font.woff2")).toBe("font/woff2");
  });

  it("returns octet-stream for unknown extensions", () => {
    expect(detectContentType("file.xyz")).toBe("application/octet-stream");
    expect(detectContentType("binary")).toBe("application/octet-stream");
  });

  it("is case-insensitive for extensions", () => {
    expect(detectContentType("INDEX.HTML")).toBe("text/html");
    expect(detectContentType("Style.CSS")).toBe("text/css");
  });
});

describe("uploadFiles", () => {
  it("uploads all files with correct params", async () => {
    s3Mock.on(PutObjectCommand).resolves({});

    await uploadFiles(fakeCreds, "us-east-1", "plot-site-test", [
      {
        key: "index.html",
        body: Buffer.from("<html></html>"),
        contentType: "text/html",
      },
      {
        key: "styles.css",
        body: Buffer.from("body {}"),
        contentType: "text/css",
      },
    ]);

    const calls = s3Mock.commandCalls(PutObjectCommand);
    expect(calls).toHaveLength(2);
    expect(calls[0].args[0].input).toMatchObject({
      Bucket: "plot-site-test",
      Key: "index.html",
      ContentType: "text/html",
    });
    expect(calls[1].args[0].input).toMatchObject({
      Bucket: "plot-site-test",
      Key: "styles.css",
      ContentType: "text/css",
    });
  });
});

describe("emptyBucket", () => {
  it("lists and deletes all objects", async () => {
    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [{ Key: "index.html" }, { Key: "styles.css" }],
      IsTruncated: false,
    });
    s3Mock.on(DeleteObjectsCommand).resolves({});

    await emptyBucket(fakeCreds, "us-east-1", "plot-site-test");

    const listCalls = s3Mock.commandCalls(ListObjectsV2Command);
    expect(listCalls).toHaveLength(1);

    const deleteCalls = s3Mock.commandCalls(DeleteObjectsCommand);
    expect(deleteCalls).toHaveLength(1);
    expect(deleteCalls[0].args[0].input.Delete?.Objects).toEqual([
      { Key: "index.html" },
      { Key: "styles.css" },
    ]);
  });

  it("handles empty bucket", async () => {
    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [],
      IsTruncated: false,
    });

    await emptyBucket(fakeCreds, "us-east-1", "plot-site-test");

    const deleteCalls = s3Mock.commandCalls(DeleteObjectsCommand);
    expect(deleteCalls).toHaveLength(0);
  });

  it("handles pagination", async () => {
    s3Mock
      .on(ListObjectsV2Command)
      .resolvesOnce({
        Contents: [{ Key: "file1.html" }],
        IsTruncated: true,
        NextContinuationToken: "token-1",
      })
      .resolvesOnce({
        Contents: [{ Key: "file2.html" }],
        IsTruncated: false,
      });
    s3Mock.on(DeleteObjectsCommand).resolves({});

    await emptyBucket(fakeCreds, "us-east-1", "plot-site-test");

    const listCalls = s3Mock.commandCalls(ListObjectsV2Command);
    expect(listCalls).toHaveLength(2);

    const deleteCalls = s3Mock.commandCalls(DeleteObjectsCommand);
    expect(deleteCalls).toHaveLength(2);
  });
});
