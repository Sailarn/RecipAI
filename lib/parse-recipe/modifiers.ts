import type { Locale } from "@/i18n/config";

/**
 * Curated preparation/state modifiers. The KEY is stored on the ingredient
 * (language-agnostic); en/ua are display labels for the chip. Display-only —
 * never used for search, pantry, or vocab matching. Keep in sync with the
 * admin backfill (RecipAI-Admin) which imports the same key set.
 */
export const PREPARATION_MODIFIERS = {
  // Preparation — the KEY is stored; `ua` is a single context-neutral word.
  // We deliberately do NOT model per-food-category variants (e.g. bread vs
  // cheese slicing): the saved RecipeIngredient carries no food category
  // (`category` exists only on ParsedIngredient and is dropped at save), so a
  // renderer cannot resolve a variant. Where English distinguishes but Ukrainian
  // has no clean universal word, we pick the least-wrong neutral term and accept
  // it — «фарш» is a noun, not a modifier, so MINCED uses «подрібнений».
  SLICED: { en: "sliced", ua: "нарізаний" },
  DICED: { en: "diced", ua: "кубиками" },
  MINCED: { en: "minced", ua: "подрібнений" },
  GRATED: { en: "grated", ua: "тертий" },
  CHOPPED: { en: "chopped", ua: "рубаний" },
  SHREDDED: { en: "shredded", ua: "подрібнений" },
  CRUSHED: { en: "crushed", ua: "товчений" },
  CRUMBLED: { en: "crumbled", ua: "розкришений" },
  MASHED: { en: "mashed", ua: "розім'ятий" },
  GROUND: { en: "ground", ua: "мелений" },
  PEELED: { en: "peeled", ua: "очищений" },
  DRAINED: { en: "drained", ua: "зціджений" },
  BEATEN: { en: "beaten", ua: "збитий" },
  WHIPPED: { en: "whipped", ua: "збитий" },
  SIFTED: { en: "sifted", ua: "просіяний" },
  FINELY_CHOPPED: { en: "finely chopped", ua: "дрібно посічений" },
  FINELY_DICED: { en: "finely diced", ua: "дрібно нарізаний кубиками" },
  IN_LARGE_PIECES: { en: "in large pieces", ua: "великими шматками" },
  FRIED: { en: "fried", ua: "смажений" },
  // State
  WARM: { en: "warm", ua: "теплий" },
  COLD: { en: "cold", ua: "холодний" },
  CHILLED: { en: "chilled", ua: "охолоджений" },
  ROOM_TEMPERATURE: {
    en: "room temperature",
    ua: "кімнатної температури",
  },
  MELTED: { en: "melted", ua: "розтоплений" },
  SOFTENED: { en: "softened", ua: "розм'якшений" },
  SOFT: { en: "soft", ua: "м'який" },
  TOASTED: { en: "toasted", ua: "підсмажений" },
  ROASTED: { en: "roasted", ua: "запечений" },
  BOILED: { en: "boiled", ua: "відварений" },
  DRIED: { en: "dried", ua: "сушений" },
  FRESH: { en: "fresh", ua: "свіжий" },
  FROZEN: { en: "frozen", ua: "заморожений" },
} as const;

export type PreparationModifier = keyof typeof PREPARATION_MODIFIERS;

export function isPreparationModifier(
  value: string,
): value is PreparationModifier {
  return Object.hasOwn(PREPARATION_MODIFIERS, value);
}

export function modifierLabel(
  key: PreparationModifier,
  locale: Locale,
): string {
  return PREPARATION_MODIFIERS[key][locale];
}

/** Pipe-joined key list injected into the parse prompts so the AI picks a valid key. */
export function modifierPromptList(): string {
  return Object.keys(PREPARATION_MODIFIERS).join(" | ");
}
