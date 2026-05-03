import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { awsConnections } from "@/lib/db/schema";

export type AwsConnection = typeof awsConnections.$inferSelect;
export type NewAwsConnection = typeof awsConnections.$inferInsert;

export async function getAwsConnection(
  userId: string,
): Promise<AwsConnection | null> {
  const rows = await db
    .select()
    .from(awsConnections)
    .where(eq(awsConnections.userId, userId));

  return rows[0] ?? null;
}

export async function upsertAwsConnection(
  connection: NewAwsConnection,
): Promise<AwsConnection> {
  const rows = await db
    .insert(awsConnections)
    .values(connection)
    .onConflictDoUpdate({
      target: awsConnections.userId,
      set: {
        roleArn: connection.roleArn,
        externalId: connection.externalId,
        awsAccountId: connection.awsAccountId,
        region: connection.region,
        connectedAt: new Date(),
      },
    })
    .returning();

  return rows[0];
}

export async function deleteAwsConnection(userId: string): Promise<void> {
  await db.delete(awsConnections).where(eq(awsConnections.userId, userId));
}
