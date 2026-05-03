import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockOnConflictDoUpdate = vi.fn();
const mockReturning = vi.fn();
const mockDeleteFn = vi.fn();
const mockDeleteWhere = vi.fn();

vi.mock("@/lib/db/client", () => ({
  db: {
    select: () => {
      mockSelect();
      return { from: (table: unknown) => { mockFrom(table); return { where: (cond: unknown) => { mockWhere(cond); return Promise.resolve([]); } }; } };
    },
    insert: (table: unknown) => {
      mockInsert(table);
      return {
        values: (vals: unknown) => {
          mockValues(vals);
          return {
            onConflictDoUpdate: (opts: unknown) => {
              mockOnConflictDoUpdate(opts);
              return {
                returning: () => {
                  mockReturning();
                  return Promise.resolve([{
                    userId: "user_123",
                    roleArn: "arn:aws:iam::123456789012:role/test",
                    externalId: "ext-123",
                    awsAccountId: "123456789012",
                    region: "us-east-1",
                    connectedAt: new Date(),
                  }]);
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
  getAwsConnection,
  upsertAwsConnection,
  deleteAwsConnection,
} from "@/lib/db/queries/aws-connections";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("aws-connections queries", () => {
  describe("getAwsConnection", () => {
    it("queries by userId and returns null when no rows", async () => {
      const result = await getAwsConnection("user_123");
      expect(result).toBeNull();
      expect(mockSelect).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
    });
  });

  describe("upsertAwsConnection", () => {
    it("inserts with onConflictDoUpdate and returns the row", async () => {
      const input = {
        userId: "user_123",
        roleArn: "arn:aws:iam::123456789012:role/test",
        externalId: "ext-123",
        awsAccountId: "123456789012",
        region: "us-east-1",
      };

      const result = await upsertAwsConnection(input);

      expect(result.userId).toBe("user_123");
      expect(result.awsAccountId).toBe("123456789012");
      expect(mockInsert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith(input);
      expect(mockOnConflictDoUpdate).toHaveBeenCalled();
      expect(mockReturning).toHaveBeenCalled();
    });
  });

  describe("deleteAwsConnection", () => {
    it("deletes by userId", async () => {
      await deleteAwsConnection("user_123");
      expect(mockDeleteFn).toHaveBeenCalled();
      expect(mockDeleteWhere).toHaveBeenCalled();
    });
  });
});
