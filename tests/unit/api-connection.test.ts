import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db/queries/aws-connections", () => ({
  getAwsConnection: vi.fn(),
  deleteAwsConnection: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import {
  getAwsConnection,
  deleteAwsConnection,
} from "@/lib/db/queries/aws-connections";
import { GET, DELETE } from "@/app/api/aws/connection/route";

const mockAuth = vi.mocked(auth);
const mockGet = vi.mocked(getAwsConnection);
const mockDelete = vi.mocked(deleteAwsConnection);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/aws/connection", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the connection when it exists", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const connection = {
      userId: "user_123",
      roleArn: "arn:aws:iam::123456789012:role/test",
      externalId: "ext-123",
      awsAccountId: "123456789012",
      region: "us-east-1",
      connectedAt: new Date(),
    };
    mockGet.mockResolvedValue(connection);

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.connection.awsAccountId).toBe("123456789012");
  });

  it("returns null when no connection exists", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    mockGet.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.connection).toBeNull();
  });
});

describe("DELETE /api/aws/connection", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const res = await DELETE();
    expect(res.status).toBe(401);
  });

  it("deletes the connection and returns success", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    mockDelete.mockResolvedValue(undefined);

    const res = await DELETE();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith("user_123");
  });
});
