import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { deployments } from "@/lib/db/schema";

export type Deployment = typeof deployments.$inferSelect;
export type NewDeployment = typeof deployments.$inferInsert;

export async function createDeployment(
  deployment: NewDeployment,
): Promise<Deployment> {
  const rows = await db.insert(deployments).values(deployment).returning();
  return rows[0];
}

export async function getDeployment(
  id: string,
  siteId: string,
): Promise<Deployment | null> {
  const rows = await db
    .select()
    .from(deployments)
    .where(eq(deployments.id, id));

  const deployment = rows[0] ?? null;
  if (deployment && deployment.siteId !== siteId) return null;
  return deployment;
}

export async function getDeploymentsBySite(
  siteId: string,
): Promise<Deployment[]> {
  return db
    .select()
    .from(deployments)
    .where(eq(deployments.siteId, siteId));
}

export async function updateDeployment(
  id: string,
  updates: Partial<
    Pick<Deployment, "status" | "finishedAt" | "errorMessage" | "fileCount">
  >,
): Promise<Deployment> {
  const rows = await db
    .update(deployments)
    .set(updates)
    .where(eq(deployments.id, id))
    .returning();

  return rows[0];
}
