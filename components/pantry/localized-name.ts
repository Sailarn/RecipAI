import type { PantryItem, VocabularyIngredient } from "@/lib/db/schema";

// Resolve a pantry item's display name in the active locale from its linked
// vocabulary entry, rather than the stored `item.name` (which is frozen to the
// language the item was added in). Falls back to the other language, then to
// the stored name when there is no vocab match (e.g. a provisional ingredient
// with no translation).
export function localizedPantryName(
  item: PantryItem,
  vocabById: Map<string, VocabularyIngredient>,
  locale: string,
): string {
  const vocab = vocabById.get(item.ingredientId ?? "");
  if (!vocab) return item.name;
  const localized =
    locale === "ua" ? (vocab.ua ?? vocab.en) : (vocab.en ?? vocab.ua);
  return localized ?? item.name;
}
