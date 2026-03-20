import Dexie, { type EntityTable } from "dexie";
import type { Recipe } from "./schema";

/**
 * Database class extending Dexie
 * Defines the structure of our IndexedDB database
 */
class RecipeDatabase extends Dexie {
  // Define table with Recipe type
  recipes!: EntityTable<Recipe, "id">;

  constructor() {
    super("RecipeAppDB"); // Database name

    // Schema version 1
    this.version(1).stores({
      recipes: "id, title, createdAt, updatedAt", // Indexed fields
    });
  }
}

// Export single instance (singleton pattern)
export const db = new RecipeDatabase();
