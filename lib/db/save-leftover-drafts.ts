import { db } from "./db";
import {
  findLocalRecipeIdBySource,
  saveParsedRecipe,
} from "./save-parsed-recipe";

/**
 * Parses used to wait in `parsedRecipes` for a Save/Edit tap; they now save
 * themselves. Saves any drafts still waiting from before that change — skipping
 * one whose link is already in the library — and clears the table. A no-op
 * once the table is empty.
 */
export async function saveLeftoverParseDrafts(): Promise<void> {
  const drafts = await db.parsedRecipes.toArray();
  for (const draft of drafts) {
    const alreadySaved =
      draft.sourceUrl && (await findLocalRecipeIdBySource(draft.sourceUrl));
    if (!alreadySaved) await saveParsedRecipe(draft);
    await db.parsedRecipes.delete(draft.id);
  }
}
