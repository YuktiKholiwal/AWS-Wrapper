import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/aws/assume-role", () => ({
  assumeRole: vi.fn(),
  verifyConnection: vi.fn(),
}));

vi.mock("@/lib/db/queries/aws-connections", () => ({
  upsertAwsConnection: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { assumeRole, verifyConnection } from "@/lib/aws/assume-role";
import { upsertAwsConnection } from "@/lib/db/queries/aws-connections";
import { POST } from "@/app/api/aws/connect/route";

const mockAuth = vi.mocked(auth);
const mockAssumeRole = vi.mocked(assumeRole);
const mockVerifyConnection = vi.mocked(verifyConnection);
const mockUpsert = vi.mocked(upsertAwsConnection);

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/aws/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  roleArn: "arn:aws:iam::123456789012:role/plot-cross-account-test",
  region: "us-east-1",
  externalId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/aws/connect", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid input", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const res = await POST(makeRequest({ roleArn: "bad", region: "x" }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Invalid input");
  });

  it("returns 400 when externalId is missing", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const res = await POST(
      makeRequest({
        roleArn: validBody.roleArn,
        region: validBody.region,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("connects successfully with valid input", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const tempCreds = {
      accessKeyId: "ASIA_TEST",
      secretAccessKey: "secret",
      sessionToken: "token",
      expiration: new Date(),
    };
    mockAssumeRole.mockResolvedValue(tempCreds);
    mockVerifyConnection.mockResolvedValue("123456789012");

    const connection = {
      userId: "user_123",
      roleArn: validBody.roleArn,
      externalId: validBody.externalId,
      awsAccountId: "123456789012",
      region: "us-east-1",
      connectedAt: new Date(),
    };
    mockUpsert.mockResolvedValue(connection);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.connection.awsAccountId).toBe("123456789012");

    expect(mockAssumeRole).toHaveBeenCalledWith(
      validBody.roleArn,
      validBody.externalId,
    );
    expect(mockVerifyConnection).toHaveBeenCalledWith(tempCreds);
    expect(mockUpsert).toHaveBeenCalledWith({
      userId: "user_123",
      roleArn: validBody.roleArn,
      externalId: validBody.externalId,
      awsAccountId: "123456789012",
      region: "us-east-1",
    });
  });

  it("returns 422 when AssumeRole fails", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    mockAssumeRole.mockRejectedValue(new Error("Access denied"));

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(422);

    const data = await res.json();
    expect(data.error).toBe("Access denied");
  });
});
