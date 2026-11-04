import { and, desc, eq, ilike, or, type SQL, sql } from "drizzle-orm";
import { db } from "@/db";
import { collections } from "@/db/schema/collections";
import { recipes } from "@/db/schema/recipes";
import {
  type RecipeSummaryView,
  type RecipeView,
  toRecipeSummaryView,
  toRecipeView,
} from "./view";

// Owner-scoped recipe reads for the AI connector (/api/mcp). Every query
// filters on the caller's user id; tools never take a user id argument.

export const MAX_LIST_LIMIT = 50;
export const DEFAULT_LIST_LIMIT = 20;
const MAX_QUERY_TERMS = 8;

export interface ListRecipesOptions {
  query?: string;
  category?: string;
  collectionId?: string;
  limit?: number;
  offset?: number;
}

export interface RecipeListPage {
  recipes: RecipeSummaryView[];
  /** Offset for the next page, or null when this is the last one. */
  nextOffset: number | null;
}

/** Escape LIKE wildcards so user text matches literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Split a free-text query into distinct search terms. */
export function searchTerms(query: string | undefined): string[] {
  if (!query) return [];
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
  return [...new Set(terms)].slice(0, MAX_QUERY_TERMS);
}

/**
 * Every term must appear in the title, the description, an ingredient name or
 * the name of a collection the recipe is in ("chicken soup" finds recipes
 * mentioning both words; "desserts" finds the Desserts collection).
 */
function termCondition(term: string, userId: string): SQL | undefined {
  const pattern = `%${escapeLike(term)}%`;
  return or(
    ilike(recipes.title, pattern),
    ilike(recipes.description, pattern),
    sql`jsonb_path_query_array(${recipes.ingredients}, '$[*].item')::text ILIKE ${pattern}`,
    sql`exists (
      select 1 from "collections" as "c"
      where "c"."user_id" = ${userId}
        and "c"."name" ILIKE ${pattern}
        and "recipes"."collection_ids" @> jsonb_build_array("c"."id")
    )`,
  );
}

export async function listRecipes(
  userId: string,
  origin: string,
  options: ListRecipesOptions = {},
): Promise<RecipeListPage> {
  const limit = Math.min(
    Math.max(1, options.limit ?? DEFAULT_LIST_LIMIT),
    MAX_LIST_LIMIT,
  );
  const offset = Math.max(0, options.offset ?? 0);

  const conditions: Array<SQL | undefined> = [eq(recipes.userId, userId)];
  for (const term of searchTerms(options.query)) {
    conditions.push(termCondition(term, userId));
  }
  if (options.category) {
    conditions.push(ilike(recipes.category, escapeLike(options.category)));
  }
  if (options.collectionId) {
    conditions.push(
      sql`${recipes.collectionIds} @> ${JSON.stringify([options.collectionId])}::jsonb`,
    );
  }

  const rows = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      category: recipes.category,
      servings: recipes.servings,
      totalTime: recipes.totalTime,
      status: recipes.status,
      updatedAt: recipes.updatedAt,
    })
    .from(recipes)
    .where(and(...conditions))
    .orderBy(desc(recipes.updatedAt), desc(recipes.id))
    .limit(limit + 1)
    .offset(offset);

  const page = rows.slice(0, limit);
  return {
    recipes: page.map((row) => toRecipeSummaryView(row, origin)),
    nextOffset: rows.length > limit ? offset + limit : null,
  };
}

/** The user's collection names by id. */
export async function collectionNamesFor(
  userId: string,
): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: collections.id, name: collections.name })
    .from(collections)
    .where(eq(collections.userId, userId));
  return new Map(rows.map((row) => [row.id, row.name]));
}

export async function getRecipe(
  userId: string,
  id: string,
  origin: string,
): Promise<RecipeView | null> {
  const [row] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
    .limit(1);
  if (!row) return null;
  return toRecipeView(row, origin, await collectionNamesFor(userId));
}
