import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();

const fakeDeployment = {
  id: "dep_1",
  siteId: "site_1",
  status: "uploading" as const,
  fileCount: null,
  startedAt: new Date(),
  finishedAt: null,
  errorMessage: null,
};

vi.mock("@/lib/db/client", () => ({
  db: {
    insert: (table: unknown) => {
      mockInsert(table);
      return {
        values: (vals: unknown) => {
          mockValues(vals);
          return {
            returning: () => {
              mockReturning();
              return Promise.resolve([fakeDeployment]);
            },
          };
        },
      };
    },
    select: () => {
      mockSelect();
      return {
        from: (table: unknown) => {
          mockFrom(table);
          return {
            where: (cond: unknown) => {
              mockWhere(cond);
              return Promise.resolve([fakeDeployment]);
            },
          };
        },
      };
    },
    update: (table: unknown) => {
      mockUpdate(table);
      return {
        set: (vals: unknown) => {
          mockSet(vals);
          return {
            where: (cond: unknown) => {
              mockWhere(cond);
              return {
                returning: () => {
                  mockReturning();
                  return Promise.resolve([
                    { ...fakeDeployment, status: "live" },
                  ]);
                },
              };
            },
          };
        },
      };
    },
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
}));

import {
  createDeployment,
  getDeployment,
  getDeploymentsBySite,
  updateDeployment,
} from "@/lib/db/queries/deployments";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deployments queries", () => {
  it("creates a deployment", async () => {
    const result = await createDeployment({
      id: "dep_1",
      siteId: "site_1",
    });

    expect(result.id).toBe("dep_1");
    expect(mockInsert).toHaveBeenCalled();
  });

  it("gets a deployment by id and siteId", async () => {
    const result = await getDeployment("dep_1", "site_1");
    expect(result?.id).toBe("dep_1");
  });

  it("returns null for wrong siteId", async () => {
    const result = await getDeployment("dep_1", "wrong_site");
    expect(result).toBeNull();
  });

  it("gets deployments by site", async () => {
    const result = await getDeploymentsBySite("site_1");
    expect(result).toHaveLength(1);
  });

  it("updates a deployment", async () => {
    const result = await updateDeployment("dep_1", { status: "live" });
    expect(result.status).toBe("live");
    expect(mockUpdate).toHaveBeenCalled();
  });
});
