import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db/queries/aws-connections", () => ({
  getAwsConnection: vi.fn(),
}));
vi.mock("@/lib/db/queries/sites", () => ({
  createSite: vi.fn(),
  getSitesByUser: vi.fn(),
  updateSite: vi.fn(),
}));
vi.mock("@/lib/aws/assume-role", () => ({ assumeRole: vi.fn() }));
vi.mock("@/lib/aws/cloudformation", () => ({ deployStack: vi.fn() }));
vi.mock("@/lib/aws/templates/static-site", () => ({
  staticSiteTemplate: "mock-template",
}));
vi.mock("nanoid", () => ({
  customAlphabet: () => () => "test12345678",
}));

import { auth } from "@clerk/nextjs/server";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { createSite, getSitesByUser, updateSite } from "@/lib/db/queries/sites";
import { assumeRole } from "@/lib/aws/assume-role";
import { deployStack } from "@/lib/aws/cloudformation";
import { POST, GET } from "@/app/api/sites/route";

const mockAuth = vi.mocked(auth);
const mockGetConn = vi.mocked(getAwsConnection);
const mockCreateSite = vi.mocked(createSite);
const mockGetSites = vi.mocked(getSitesByUser);
const mockAssumeRole = vi.mocked(assumeRole);
const mockDeployStack = vi.mocked(deployStack);
const mockUpdateSite = vi.mocked(updateSite);

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/sites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const fakeCreds = {
  accessKeyId: "ASIA_TEST",
  secretAccessKey: "secret",
  sessionToken: "token",
  expiration: new Date(),
};

const fakeConnection = {
  userId: "user_123",
  roleArn: "arn:aws:iam::123456789012:role/test",
  externalId: "ext-123",
  awsAccountId: "123456789012",
  region: "us-east-1",
  connectedAt: new Date(),
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/sites", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    const res = await POST(makeRequest({ name: "my-site" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid name", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    const res = await POST(makeRequest({ name: "INVALID!" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 without AWS connection", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    mockGetConn.mockResolvedValue(null);
    const res = await POST(makeRequest({ name: "my-site" }));
    expect(res.status).toBe(400);
  });

  it("creates site and starts stack on success", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    mockGetConn.mockResolvedValue(fakeConnection);
    mockCreateSite.mockResolvedValue({
      id: "test12345678",
      userId: "user_123",
      name: "my-site",
      stackName: "plot-site-test12345678",
      cloudfrontUrl: null,
      bucketName: null,
      distributionId: null,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockAssumeRole.mockResolvedValue(fakeCreds);
    mockDeployStack.mockResolvedValue("stack-id");
    mockUpdateSite.mockResolvedValue({
      id: "test12345678",
      userId: "user_123",
      name: "my-site",
      stackName: "plot-site-test12345678",
      cloudfrontUrl: null,
      bucketName: null,
      distributionId: null,
      status: "provisioning",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await POST(makeRequest({ name: "my-site" }));
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.site.status).toBe("provisioning");
    expect(mockDeployStack).toHaveBeenCalled();
  });
});

describe("GET /api/sites", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns sites list", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    mockGetSites.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.sites).toEqual([]);
  });
});
