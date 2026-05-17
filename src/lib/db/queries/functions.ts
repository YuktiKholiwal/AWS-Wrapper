import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { functions } from "@/lib/db/schema";

export type LambdaFunction = typeof functions.$inferSelect;
export type NewLambdaFunction = typeof functions.$inferInsert;

export async function createFunction(
  fn: NewLambdaFunction,
): Promise<LambdaFunction> {
  const rows = await db.insert(functions).values(fn).returning();
  return rows[0];
}

export async function getFunction(
  id: string,
  userId: string,
): Promise<LambdaFunction | null> {
  const rows = await db
    .select()
    .from(functions)
    .where(eq(functions.id, id));

  const fn = rows[0] ?? null;
  if (fn && fn.userId !== userId) return null;
  return fn;
}

export async function getFunctionsByUser(
  userId: string,
): Promise<LambdaFunction[]> {
  return db.select().from(functions).where(eq(functions.userId, userId));
}

export async function updateFunction(
  id: string,
  updates: Partial<
    Pick<
      LambdaFunction,
      | "name"
      | "code"
      | "runtime"
      | "handler"
      | "timeout"
      | "memorySize"
      | "status"
      | "functionArn"
      | "apiEndpoint"
    >
  >,
): Promise<LambdaFunction> {
  const rows = await db
    .update(functions)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(functions.id, id))
    .returning();

  return rows[0];
}

export async function deleteFunction(id: string): Promise<void> {
  await db.delete(functions).where(eq(functions.id, id));
}
