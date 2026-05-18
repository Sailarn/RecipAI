import { relations } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const recipes = pgTable("recipes", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  imageFileId: text("image_file_id"),
  imageFocusX: integer("image_focus_x"),
  imageFocusY: integer("image_focus_y"),
  prepTime: integer("prep_time"),
  cookTime: integer("cook_time"),
  totalTime: integer("total_time"),
  servings: integer("servings").notNull(),
  ingredients: jsonb("ingredients").notNull().default([]),
  instructions: jsonb("instructions").notNull().default([]),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  category: text("category"),
  status: text("status"),
  collectionIds: jsonb("collection_ids").notNull().default([]),
});

export const recipesRelations = relations(recipes, ({ one }) => ({
  user: one(user, {
    fields: [recipes.userId],
    references: [user.id],
  }),
}));
