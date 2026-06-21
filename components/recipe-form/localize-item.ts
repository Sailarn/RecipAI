import { getIngredientDisplayName } from "@/components/ingredient-picker/display-name";
import type { Locale } from "@/i18n/config";
import type { VocabularyIngredient } from "@/lib/db/schema";

// Index every vocabulary name and alias (both languages) to its entry, so a
// stored recipe-ingredient string in any language resolves back to its vocab
// row for localized display.
export function buildVocabNameIndex(
  vocab: VocabularyIngredient[],
): Map<string, VocabularyIngredient> {
  const index = new Map<string, VocabularyIngredient>();
  for (const entry of vocab) {
    const names = [entry.en, entry.ua, ...entry.aliasesEn, ...entry.aliasesUa];
    for (const name of names) {
      if (name) index.set(name.trim().toLowerCase(), entry);
    }
  }
  return index;
}

// Show a stored ingredient string in the active locale when it maps to a known
// vocabulary entry; otherwise leave it untouched (descriptive parsed text that
// isn't a clean vocab match stays as written). Display-only — the stored value
// is unchanged until the user re-picks from the curated list.
export function localizeIngredientItem(
  item: string,
  vocabIndex: Map<string, VocabularyIngredient>,
  locale: Locale,
): string {
  const entry = vocabIndex.get(item.trim().toLowerCase());
  return entry ? getIngredientDisplayName(entry, locale) : item;
}
