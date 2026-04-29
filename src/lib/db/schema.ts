import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Placeholder table to verify Drizzle migrations work end-to-end.
// Will be replaced with real tables in Phase 1.
export const placeholder = pgTable("placeholder", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
