import { normalizeRecipeIngredients } from "@/lib/parse-recipe/normalize-ingredients";
import { db } from "./db";
import type { Recipe } from "./schema";
import { pullVocab } from "./sync-vocab";

// Run once per device after the server-side dup-ingredient cleanup SQL has
// been executed. Clears the stale Dexie ingredients table (which never deletes
// via the normal delta pull), resets the sync watermark so the next pullVocab
// fetches the full clean vocab, then re-resolves the recipes that still point
// at an id the clean vocab no longer has.
// Self-limiting via a localStorage guard — cheap no-op once done. Bump the
// version after every server-side vocab merge so devices drop the merged rows:
// v1 — the dup-ingredient cleanup; v2 — the 2026-10 audit merges
// (parmigiano reggiano → parmesan, sweetened → condensed milk).
const RECONCILE_KEY = "vocabReconciled_v2";

// Only recipes referencing a vanished id need the (slow, per-recipe network)
// normalize pass. The server merge already repointed its own recipe rows, so
// re-normalizing every recipe re-rendered the list and re-synced each recipe
// for minutes on a phone with a full library.
function referencesMissingVocab(
  recipe: Recipe,
  vocabIds: ReadonlySet<string>,
): boolean {
  return (recipe.canonicalIngredientIds ?? []).some(
    (canonicalId) => canonicalId !== "" && !vocabIds.has(canonicalId),
  );
}

export async function reconcileVocab(): Promise<void> {
  if (localStorage.getItem(RECONCILE_KEY) === "1") return;

  await db.ingredients.clear();
  localStorage.removeItem("ingredientsSyncedAt");
  await pullVocab();

  const vocabIds = new Set(
    (await db.ingredients.toCollection().primaryKeys()).map(String),
  );
  // A failed pull leaves the table empty, which would mark every recipe stale.
  // Leave the guard unset so the next launch retries.
  if (vocabIds.size === 0) {
    throw new Error("reconcileVocab: vocab pull returned no ingredients");
  }

  const recipes = await db.recipes.toArray();
  for (const recipe of recipes) {
    if (!referencesMissingVocab(recipe, vocabIds)) continue;
    await normalizeRecipeIngredients(
      recipe.id,
      recipe.ingredients.map((ingredient) => ({ item: ingredient.item })),
    );
  }

  localStorage.setItem(RECONCILE_KEY, "1");
}
