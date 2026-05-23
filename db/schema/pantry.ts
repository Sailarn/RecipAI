import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { ingredients } from "./ingredients";

export const pantry = pgTable("pantry", {
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
});
