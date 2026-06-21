import type { Locale } from "@/i18n/config";
import type { VocabularyIngredient } from "@/lib/db/schema";

// Localized display name for a vocabulary ingredient: the active-locale field,
// falling back to the other language, then to an empty string.
export function getIngredientDisplayName(
  ingredient: VocabularyIngredient,
  locale: Locale,
): string {
  return locale === "ua"
    ? (ingredient.ua ?? ingredient.en)
    : (ingredient.en ?? ingredient.ua ?? "");
}
