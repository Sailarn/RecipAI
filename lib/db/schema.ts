export interface Collection {
  id: string;
  name: string;
  emoji: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeIngredient {
  id: string;
  amount?: number;
  unit?: string;
  item: string;
}

export interface VocabularyIngredient {
  id: string;
  en: string;
  ua: string;
  category: string;
  aliasesEn: string[];
  aliasesUa: string[];
}

export interface PantryItem {
  ingredientId: string;
  addedAt: Date;
}

export interface Step {
  id: string;
  order: number;
  instruction: string;
  imageUrl?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  imageFileId?: string;
  imageFocusX?: number;
  imageFocusY?: number;
  imageCropX?: number;
  imageCropY?: number;
  imageCropWidth?: number;
  imageCropHeight?: number;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings: number;
  ingredients: RecipeIngredient[];
  instructions: Step[];
  sourceUrl?: string;
  category?: string;
  status?: "tried" | "want" | null;
  collectionIds?: string[];
  canonicalIngredientIds?: string[];
  unrecognizedIngredients?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ParsedRecipeEntry {
  id: string;
  title: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings: number;
  ingredients: Array<{ amount?: number; unit?: string; item: string }>;
  instructions: Array<{
    order: number;
    instruction: string;
    imageUrl?: string;
  }>;
  imageUrl?: string;
  imageFileId?: string;
  sourceUrl?: string;
  category?: string;
  createdAt: Date;
}

export type SyncEntityType = "recipe" | "collection";
export type SyncNotificationType = "server_only" | "local_only" | "conflicted";

export interface SyncNotification {
  id: string;
  entityId: string;
  entityType: SyncEntityType;
  type: SyncNotificationType;
  serverSnapshot: string | null;
  localSnapshot: string | null;
  createdAt: Date;
}
