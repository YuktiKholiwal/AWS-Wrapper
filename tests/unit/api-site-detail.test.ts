import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db/queries/aws-connections", () => ({
  getAwsConnection: vi.fn(),
}));
vi.mock("@/lib/db/queries/sites", () => ({
  getSite: vi.fn(),
  updateSite: vi.fn(),
  deleteSite: vi.fn(),
}));
vi.mock("@/lib/aws/assume-role", () => ({ assumeRole: vi.fn() }));
vi.mock("@/lib/aws/cloudformation", () => ({
  getStackStatus: vi.fn(),
  deleteStack: vi.fn(),
}));
vi.mock("@/lib/aws/s3-sync", () => ({ emptyBucket: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { getAwsConnection } from "@/lib/db/queries/aws-connections";
import { getSite, updateSite, deleteSite } from "@/lib/db/queries/sites";
import { assumeRole } from "@/lib/aws/assume-role";
import { getStackStatus, deleteStack } from "@/lib/aws/cloudformation";
import { emptyBucket } from "@/lib/aws/s3-sync";
import { GET, DELETE } from "@/app/api/sites/[id]/route";

const mockAuth = vi.mocked(auth);
const mockGetSite = vi.mocked(getSite);
const mockGetConn = vi.mocked(getAwsConnection);
const mockAssumeRole = vi.mocked(assumeRole);
const mockGetStackStatus = vi.mocked(getStackStatus);
const mockUpdateSite = vi.mocked(updateSite);
const mockDeleteSite = vi.mocked(deleteSite);
const mockDeleteStack = vi.mocked(deleteStack);
const mockEmptyBucket = vi.mocked(emptyBucket);

const fakeRequest = new Request("http://localhost/api/sites/site1");
const fakeParams = { params: Promise.resolve({ id: "site1" }) };

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

const fakeSite = {
  id: "site1",
  userId: "user_123",
  name: "my-site",
  stackName: "plot-site-site1",
  cloudfrontUrl: null,
  bucketName: "plot-site-site1",
  distributionId: "E1234",
  status: "provisioning" as const,
  customDomain: null,
  domainStatus: "none" as const,
  certificateArn: null,
  validationCname: null,
  validationValue: null,
  githubRepo: null,
  githubBranch: null,
  githubInstallationId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/sites/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    const res = await GET(fakeRequest, fakeParams);
    expect(res.status).toBe(401);
  });

  it("returns 404 when site not found", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    mockGetSite.mockResolvedValue(null);
    const res = await GET(fakeRequest, fakeParams);
    expect(res.status).toBe(404);
  });

  it("polls stack status when provisioning", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    mockGetSite.mockResolvedValue(fakeSite);
    mockGetConn.mockResolvedValue(fakeConnection);
    mockAssumeRole.mockResolvedValue(fakeCreds);
    mockGetStackStatus.mockResolvedValue({
      status: "CREATE_COMPLETE",
      outputs: {
        bucketName: "plot-site-site1",
        distributionId: "E1234",
        distributionDomainName: "d1234.cloudfront.net",
      },
    });
    mockUpdateSite.mockResolvedValue({
      ...fakeSite,
      status: "live",
      cloudfrontUrl: "d1234.cloudfront.net",
    });

    const res = await GET(fakeRequest, fakeParams);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.site.status).toBe("live");
  });
});

describe("DELETE /api/sites/[id]", () => {
  it("deletes site and cleans up AWS resources", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    mockGetSite.mockResolvedValue({ ...fakeSite, status: "live" });
    mockGetConn.mockResolvedValue(fakeConnection);
    mockAssumeRole.mockResolvedValue(fakeCreds);
    mockEmptyBucket.mockResolvedValue(undefined);
    mockDeleteStack.mockResolvedValue(undefined);
    mockUpdateSite.mockResolvedValue({ ...fakeSite, status: "deleting" });
    mockDeleteSite.mockResolvedValue(undefined);

    const res = await DELETE(fakeRequest, fakeParams);
    expect(res.status).toBe(200);

    expect(mockEmptyBucket).toHaveBeenCalled();
    expect(mockDeleteStack).toHaveBeenCalled();
    expect(mockDeleteSite).toHaveBeenCalled();
  });
});
