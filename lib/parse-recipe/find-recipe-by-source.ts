import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { recipes } from "@/db/schema/recipes";
import { normalizeSourceUrl } from "./normalize-url";

/**
 * The user's newest recipe imported from the same link, compared through
 * `normalizeSourceUrl` so tracking params and Instagram's /reel/ vs /p/ forms
 * match. Only ever looks inside this user's own library.
 */
export async function findRecipeIdBySource(
  userId: string,
  sourceUrl: string,
): Promise<string | null> {
  const target = normalizeSourceUrl(sourceUrl);
  const candidates = await db
    .select({ id: recipes.id, sourceUrl: recipes.sourceUrl })
    .from(recipes)
    .where(and(eq(recipes.userId, userId), isNotNull(recipes.sourceUrl)))
    .orderBy(desc(recipes.createdAt));
  const match = candidates.find(
    (candidate) =>
      candidate.sourceUrl !== null &&
      normalizeSourceUrl(candidate.sourceUrl) === target,
  );
  return match?.id ?? null;
}
