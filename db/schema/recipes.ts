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
  imageCropX: integer("image_crop_x"),
  imageCropY: integer("image_crop_y"),
  imageCropWidth: integer("image_crop_width"),
  imageCropHeight: integer("image_crop_height"),
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
  canonicalIngredientIds: jsonb("canonical_ingredient_ids").$type<string[]>(),
  unrecognizedIngredients: jsonb("unrecognized_ingredients").$type<string[]>(),
});

export const recipesRelations = relations(recipes, ({ one }) => ({
  user: one(user, {
    fields: [recipes.userId],
    references: [user.id],
  }),
}));
