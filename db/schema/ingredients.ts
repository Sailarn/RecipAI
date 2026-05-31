import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { IngredientStatus } from "@/lib/db/schema";

export const ingredients = pgTable("ingredients", {
  id: text("id").primaryKey(),
  en: text("en").notNull(),
  ua: text("ua"),
  category: text("category").notNull(),
  aliasesEn: jsonb("aliases_en").$type<string[]>().notNull().default([]),
  aliasesUa: jsonb("aliases_ua").$type<string[]>().notNull().default([]),
  status: text("status")
    .$type<IngredientStatus>()
    .notNull()
    .default("confirmed"),
  retryCount: integer("retry_count").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
