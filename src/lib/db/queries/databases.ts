import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { databases } from "@/lib/db/schema";

export type Database = typeof databases.$inferSelect;
export type NewDatabase = typeof databases.$inferInsert;

export async function createDatabase(
  database: NewDatabase,
): Promise<Database> {
  const rows = await db.insert(databases).values(database).returning();
  return rows[0];
}

export async function getDatabase(
  id: string,
  userId: string,
): Promise<Database | null> {
  const rows = await db
    .select()
    .from(databases)
    .where(eq(databases.id, id));

  const database = rows[0] ?? null;
  if (database && database.userId !== userId) return null;
  return database;
}

export async function getDatabasesByUser(
  userId: string,
): Promise<Database[]> {
  return db.select().from(databases).where(eq(databases.userId, userId));
}

export async function updateDatabase(
  id: string,
  updates: Partial<
    Pick<Database, "status" | "tableName" | "tableArn" | "region">
  >,
): Promise<Database> {
  const rows = await db
    .update(databases)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(databases.id, id))
    .returning();

  return rows[0];
}

export async function deleteDatabase(id: string): Promise<void> {
  await db.delete(databases).where(eq(databases.id, id));
}
