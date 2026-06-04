import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const providers = sqliteTable("providers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  avatar: text("avatar"),
});

export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;

export const secrets = sqliteTable("secrets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  providerId: integer("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  value: text("value").notNull(),
  remark: text("remark"),
  createdAt: text("created_at").notNull().default(sql`datetime('now')`),
  updatedAt: text("updated_at").notNull().default(sql`datetime('now')`),
});

export type Secret = typeof secrets.$inferSelect;
export type NewSecret = typeof secrets.$inferInsert;
