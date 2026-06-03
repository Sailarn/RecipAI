import Dexie, { type EntityTable } from "dexie";
import type {
  Collection,
  PantryItem,
  ParsedRecipeEntry,
  ParseHistoryEntry,
  Recipe,
  SyncNotification,
  VocabularyIngredient,
} from "./schema";

class RecipeDatabase extends Dexie {
  recipes!: EntityTable<Recipe, "id">;
  parsedRecipes!: EntityTable<ParsedRecipeEntry, "id">;
  collections!: EntityTable<Collection, "id">;
  notifications!: EntityTable<SyncNotification, "id">;
  ingredients!: EntityTable<VocabularyIngredient, "id">;
  pantry!: EntityTable<PantryItem, "id">;
  parseHistory!: EntityTable<ParseHistoryEntry, "id">;

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

    this.version(4).stores({
      recipes: "id, title, createdAt, updatedAt, status",
      parsedRecipes: "id, createdAt",
      collections: "id, name, createdAt",
    });

    this.version(5).stores({
      recipes: "id, title, createdAt, updatedAt, status",
      parsedRecipes: "id, createdAt",
      collections: "id, name, createdAt",
      notifications: "id, entityId, entityType, type, createdAt",
    });

    this.version(6).stores({
      recipes: "id, title, createdAt, updatedAt, status",
      parsedRecipes: "id, createdAt",
      collections: "id, name, createdAt",
      notifications: "id, entityId, entityType, type, createdAt",
    });

    this.version(7).stores({
      recipes: "id, title, createdAt, updatedAt, status",
      parsedRecipes: "id, createdAt",
      collections: "id, name, createdAt",
      notifications: "id, entityId, entityType, type, createdAt",
    });

    this.version(8).stores({
      recipes: "id, title, createdAt, updatedAt, status",
      parsedRecipes: "id, createdAt",
      collections: "id, name, createdAt",
      notifications: "id, entityId, entityType, type, createdAt",
      ingredients: "id, category",
      pantry: "ingredientId",
    });

    // v9: drop pantry so we can recreate it with a new primary key in v10
    // (IndexedDB does not support changing a store's keyPath in-place)
    this.version(9).stores({
      recipes: "id, title, createdAt, updatedAt, status",
      parsedRecipes: "id, createdAt",
      collections: "id, name, createdAt",
      notifications: "id, entityId, entityType, type, createdAt",
      ingredients: "id, category",
      pantry: null,
    });

    // v10: recreate pantry with id as primary key
    this.version(10).stores({
      recipes: "id, title, createdAt, updatedAt, status",
      parsedRecipes: "id, createdAt",
      collections: "id, name, createdAt",
      notifications: "id, entityId, entityType, type, createdAt",
      ingredients: "id, category",
      pantry: "id, ingredientId",
    });

    // v11: local parse history (done/failed jobs)
    this.version(11).stores({
      recipes: "id, title, createdAt, updatedAt, status",
      parsedRecipes: "id, createdAt",
      collections: "id, name, createdAt",
      notifications: "id, entityId, entityType, type, createdAt",
      ingredients: "id, category",
      pantry: "id, ingredientId",
      parseHistory: "id, createdAt, status",
    });
  }
}

export const db = new RecipeDatabase();
