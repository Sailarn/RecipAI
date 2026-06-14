import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { ingredients } from "./ingredients";

export const pantry = pgTable(
  "pantry",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ingredientId: text("ingredient_id").references(() => ingredients.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    qty: integer("qty").notNull().default(1),
    unit: text("unit").notNull().default("pcs"),
    cat: text("cat").notNull().default("Other"),
    on: boolean("on").notNull().default(true),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (table) => [
    // One pantry row per (user, ingredient). Partial so free-text items
    // (ingredient_id IS NULL) can still coexist for the same user.
    uniqueIndex("pantry_user_ingredient_uniq")
      .on(table.userId, table.ingredientId)
      .where(sql`${table.ingredientId} IS NOT NULL`),
  ],
);
