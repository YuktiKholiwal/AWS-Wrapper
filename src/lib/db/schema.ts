import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const awsConnections = pgTable("aws_connections", {
  userId: text("user_id").primaryKey(),
  roleArn: text("role_arn").notNull(),
  externalId: text("external_id").notNull(),
  awsAccountId: text("aws_account_id").notNull(),
  region: text("region").notNull(),
  connectedAt: timestamp("connected_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
