import Dexie, { type EntityTable } from "dexie";
import type {
  Collection,
  PantryItem,
  ParsedRecipeEntry,
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

    this.version(9).stores({
      recipes: "id, title, createdAt, updatedAt, status",
      parsedRecipes: "id, createdAt",
      collections: "id, name, createdAt",
      notifications: "id, entityId, entityType, type, createdAt",
      ingredients: "id, category",
      pantry: "id, ingredientId",
    });
  }
}

export const db = new RecipeDatabase();
