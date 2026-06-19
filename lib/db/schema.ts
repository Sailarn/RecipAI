import type { RecipeCategory } from "@/lib/categories";

export const RECIPE_STATUSES = ["tried"] as const;
export type RecipeStatus = (typeof RECIPE_STATUSES)[number];

export const INGREDIENT_STATUS = {
  PROVISIONAL: "provisional",
  CONFIRMED: "confirmed",
  FAILED: "failed",
} as const;
export type IngredientStatus =
  (typeof INGREDIENT_STATUS)[keyof typeof INGREDIENT_STATUS];

export const PARSE_JOB_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  DONE: "done",
  FAILED: "failed",
} as const;
export type ParseJobStatus =
  (typeof PARSE_JOB_STATUS)[keyof typeof PARSE_JOB_STATUS];

// Terminal outcomes recorded in the local parse history.
export const PARSE_HISTORY_STATUS = {
  DONE: "done",
  FAILED: "failed",
} as const;
export type ParseHistoryStatus =
  (typeof PARSE_HISTORY_STATUS)[keyof typeof PARSE_HISTORY_STATUS];

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
  ua: string | null;
  category: string;
  aliasesEn: string[];
  aliasesUa: string[];
  status?: IngredientStatus;
  retryCount?: number;
  lastAttemptAt?: Date | null;
  embedding?: number[] | null;
}

export interface PantryItem {
  id: string;
  ingredientId?: string;
  name: string;
  qty: number;
  unit: string;
  cat: string;
  on: boolean;
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
  status?: RecipeStatus | null;
  collectionIds?: string[];
  canonicalIngredientIds?: string[];
  unrecognizedIngredients?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ParsedIngredient {
  amount?: number;
  unit?: string;
  item: string;
  ua?: string | null;
  category?: string | null;
}

export interface ParsedRecipe {
  title: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings: number;
  ingredients: ParsedIngredient[];
  instructions: Array<{ order: number; instruction: string }>;
  imageUrl?: string;
  imageFileId?: string;
  sourceUrl: string;
  category?: RecipeCategory;
}

export interface ParsedRecipeEntry {
  id: string;
  title: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings: number;
  ingredients: ParsedIngredient[];
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

// One row per finished parse job (done or failed), kept locally so the user
// can review past imports — including failures — offline. `id` is the parse
// job id, so it aligns with the server `parse_jobs` row for future sync.
export interface ParseHistoryEntry {
  id: string;
  title: string;
  status: ParseHistoryStatus;
  /** Original source link; absent for photo imports. */
  url?: string;
  reason?: string;
  createdAt: Date;
}

export const SYNC_ENTITY_TYPES = ["recipe", "collection"] as const;
export type SyncEntityType = (typeof SYNC_ENTITY_TYPES)[number];

export const SYNC_NOTIFICATION_TYPES = [
  "server_only",
  "local_only",
  "conflicted",
] as const;
export type SyncNotificationType = (typeof SYNC_NOTIFICATION_TYPES)[number];

export interface SyncNotification {
  id: string;
  entityId: string;
  entityType: SyncEntityType;
  type: SyncNotificationType;
  serverSnapshot: string | null;
  localSnapshot: string | null;
  createdAt: Date;
}
