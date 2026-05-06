import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockDeleteFn = vi.fn();
const mockDeleteWhere = vi.fn();

const fakeSite = {
  id: "site_1",
  userId: "user_123",
  name: "my-site",
  stackName: "plot-site-site_1",
  cloudfrontUrl: null,
  bucketName: null,
  distributionId: null,
  status: "pending" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
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
              return Promise.resolve([fakeSite]);
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
              return Promise.resolve([fakeSite]);
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
                  return Promise.resolve([{ ...fakeSite, status: "live" }]);
                },
              };
            },
          };
        },
      };
    },
    delete: (table: unknown) => {
      mockDeleteFn(table);
      return {
        where: (cond: unknown) => {
          mockDeleteWhere(cond);
          return Promise.resolve();
        },
      };
    },
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ col, val }),
}));

import {
  createSite,
  getSite,
  getSitesByUser,
  updateSite,
  deleteSite,
} from "@/lib/db/queries/sites";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sites queries", () => {
  it("creates a site", async () => {
    const result = await createSite({
      id: "site_1",
      userId: "user_123",
      name: "my-site",
      stackName: "plot-site-site_1",
    });

    expect(result.id).toBe("site_1");
    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalled();
  });

  it("gets a site by id and userId", async () => {
    const result = await getSite("site_1", "user_123");
    expect(result?.id).toBe("site_1");
    expect(mockSelect).toHaveBeenCalled();
  });

  it("returns null for wrong userId", async () => {
    const result = await getSite("site_1", "wrong_user");
    expect(result).toBeNull();
  });

  it("gets sites by user", async () => {
    const result = await getSitesByUser("user_123");
    expect(result).toHaveLength(1);
    expect(mockSelect).toHaveBeenCalled();
  });

  it("updates a site", async () => {
    const result = await updateSite("site_1", { status: "live" });
    expect(result.status).toBe("live");
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalled();
  });

  it("deletes a site", async () => {
    await deleteSite("site_1");
    expect(mockDeleteFn).toHaveBeenCalled();
    expect(mockDeleteWhere).toHaveBeenCalled();
  });
});
