import type { Locale } from "@/i18n/config";

/**
 * Curated preparation/state modifiers. The KEY is stored on the ingredient
 * (language-agnostic); en/uk are display labels for the chip. Display-only —
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
  SLICED: { en: "sliced", uk: "нарізаний" },
  DICED: { en: "diced", uk: "кубиками" },
  MINCED: { en: "minced", uk: "подрібнений" },
  GRATED: { en: "grated", uk: "тертий" },
  CHOPPED: { en: "chopped", uk: "рубаний" },
  SHREDDED: { en: "shredded", uk: "подрібнений" },
  CRUSHED: { en: "crushed", uk: "товчений" },
  CRUMBLED: { en: "crumbled", uk: "розкришений" },
  MASHED: { en: "mashed", uk: "розім'ятий" },
  GROUND: { en: "ground", uk: "мелений" },
  PEELED: { en: "peeled", uk: "очищений" },
  DRAINED: { en: "drained", uk: "зціджений" },
  BEATEN: { en: "beaten", uk: "збитий" },
  WHIPPED: { en: "whipped", uk: "збитий" },
  SIFTED: { en: "sifted", uk: "просіяний" },
  FINELY_CHOPPED: { en: "finely chopped", uk: "дрібно посічений" },
  FINELY_DICED: { en: "finely diced", uk: "дрібно нарізаний кубиками" },
  IN_LARGE_PIECES: { en: "in large pieces", uk: "великими шматками" },
  FRIED: { en: "fried", uk: "смажений" },
  // State
  WARM: { en: "warm", uk: "теплий" },
  COLD: { en: "cold", uk: "холодний" },
  CHILLED: { en: "chilled", uk: "охолоджений" },
  ROOM_TEMPERATURE: {
    en: "room temperature",
    uk: "кімнатної температури",
  },
  MELTED: { en: "melted", uk: "розтоплений" },
  SOFTENED: { en: "softened", uk: "розм'якшений" },
  SOFT: { en: "soft", uk: "м'який" },
  TOASTED: { en: "toasted", uk: "підсмажений" },
  ROASTED: { en: "roasted", uk: "запечений" },
  BOILED: { en: "boiled", uk: "відварений" },
  DRIED: { en: "dried", uk: "сушений" },
  FRESH: { en: "fresh", uk: "свіжий" },
  FROZEN: { en: "frozen", uk: "заморожений" },
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
