import Dexie, { type EntityTable } from "dexie";
import type { ParsedRecipeEntry, Recipe } from "./schema";

class RecipeDatabase extends Dexie {
  recipes!: EntityTable<Recipe, "id">;
  parsedRecipes!: EntityTable<ParsedRecipeEntry, "id">;

  constructor() {
    super("RecipeAppDB");

    this.version(1).stores({
      recipes: "id, title, createdAt, updatedAt",
    });

    this.version(2).stores({
      recipes: "id, title, createdAt, updatedAt",
      parsedRecipes: "id, createdAt",
    });

    this.version(3).stores({
      recipes: "id, title, createdAt, updatedAt, status",
      parsedRecipes: "id, createdAt",
    });
  }
}

export const db = new RecipeDatabase();
