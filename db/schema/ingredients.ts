import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const ingredients = pgTable("ingredients", {
  id: text("id").primaryKey(),
  en: text("en").notNull(),
  ua: text("ua").notNull(),
  category: text("category").notNull(),
  aliasesEn: jsonb("aliases_en").$type<string[]>().notNull().default([]),
  aliasesUa: jsonb("aliases_ua").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
