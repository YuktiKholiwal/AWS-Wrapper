import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sites } from "@/lib/db/schema";

export type Site = typeof sites.$inferSelect;
export type NewSite = typeof sites.$inferInsert;
export type SiteStatus = Site["status"];

export async function createSite(site: NewSite): Promise<Site> {
  const rows = await db.insert(sites).values(site).returning();
  return rows[0];
}

export async function getSite(
  id: string,
  userId: string,
): Promise<Site | null> {
  const rows = await db
    .select()
    .from(sites)
    .where(eq(sites.id, id));

  const site = rows[0] ?? null;
  if (site && site.userId !== userId) return null;
  return site;
}

export async function getSitesByUser(userId: string): Promise<Site[]> {
  return db.select().from(sites).where(eq(sites.userId, userId));
}

export async function updateSite(
  id: string,
  updates: Partial<
    Pick<
      Site,
      | "status"
      | "cloudfrontUrl"
      | "bucketName"
      | "distributionId"
      | "customDomain"
      | "domainStatus"
      | "certificateArn"
      | "validationCname"
      | "validationValue"
    >
  >,
): Promise<Site> {
  const rows = await db
    .update(sites)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(sites.id, id))
    .returning();

  return rows[0];
}

export async function deleteSite(id: string): Promise<void> {
  await db.delete(sites).where(eq(sites.id, id));
}
