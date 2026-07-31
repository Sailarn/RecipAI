import type { Locale } from "@/i18n/config";

/**
 * Measurement units are stored as canonical English codes — the parse prompt
 * pins `unit` to this set (see METRIC_UNITS_RULE) and the servings calculator
 * scales against it. Localization is display-only: the stored value never
 * changes, so a recipe reads the same on every device regardless of language.
 *
 * Mirrors the PREPARATION_MODIFIERS pattern — canonical key stored, en/ua for
 * the label.
 */
export const MEASUREMENT_UNITS = {
  g: { en: "g", ua: "г" },
  kg: { en: "kg", ua: "кг" },
  ml: { en: "ml", ua: "мл" },
  l: { en: "l", ua: "л" },
  tsp: { en: "tsp", ua: "ч. л." },
  tbsp: { en: "tbsp", ua: "ст. л." },
  pcs: { en: "pcs", ua: "шт" },
} as const;

export type MeasurementUnit = keyof typeof MEASUREMENT_UNITS;

/**
 * Everything that has ever plausibly landed in the free-text unit field —
 * imported recipes, hand edits, and AI output that ignored the enum — mapped to
 * its canonical code. Keys are stored in *collapsed* form (lowercase, spaces
 * and periods removed) so one entry covers "ч. л.", "ч.л." and "чл".
 *
 * Ukrainian and Russian spellings are both listed: the parse pipeline treats
 * ru sources as ua, so either can reach the field.
 */
const UNIT_ALIASES: Record<string, MeasurementUnit> = {
  g: "g",
  gr: "g",
  gm: "g",
  gms: "g",
  gram: "g",
  grams: "g",
  gramme: "g",
  grammes: "g",
  г: "g",
  гр: "g",
  грам: "g",
  грама: "g",
  грамів: "g",
  грамм: "g",
  грамма: "g",
  граммов: "g",

  kg: "kg",
  kgs: "kg",
  kilo: "kg",
  kilos: "kg",
  kilogram: "kg",
  kilograms: "kg",
  кг: "kg",
  кіло: "kg",
  кило: "kg",
  кілограм: "kg",
  кілограма: "kg",
  кілограмів: "kg",
  килограмм: "kg",
  килограммов: "kg",

  ml: "ml",
  mls: "ml",
  milliliter: "ml",
  millilitre: "ml",
  milliliters: "ml",
  millilitres: "ml",
  мл: "ml",
  мілілітр: "ml",
  мілілітра: "ml",
  мілілітрів: "ml",
  миллилитр: "ml",
  миллилитров: "ml",

  l: "l",
  lt: "l",
  ltr: "l",
  liter: "l",
  litre: "l",
  liters: "l",
  litres: "l",
  л: "l",
  літр: "l",
  літра: "l",
  літрів: "l",
  литр: "l",
  литра: "l",
  литров: "l",

  tsp: "tsp",
  tsps: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  чл: "tsp",
  чложка: "tsp",
  чайналожка: "tsp",
  чайніложки: "tsp",
  чайнихложок: "tsp",
  чайнаяложка: "tsp",
  чайныеложки: "tsp",
  чайныхложек: "tsp",

  tbsp: "tbsp",
  tbsps: "tbsp",
  tbs: "tbsp",
  tbl: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  стл: "tbsp",
  стложка: "tbsp",
  столоваложка: "tbsp",
  столовіложки: "tbsp",
  столовихложок: "tbsp",
  столоваяложка: "tbsp",
  столовыеложки: "tbsp",
  столовыхложек: "tbsp",

  pcs: "pcs",
  pc: "pcs",
  piece: "pcs",
  pieces: "pcs",
  шт: "pcs",
  штука: "pcs",
  штуки: "pcs",
  штук: "pcs",
  штучка: "pcs",
  штучки: "pcs",
};

// Collapsing whitespace and periods lets one alias entry absorb every spacing
// and abbreviation style of the same unit.
function collapseUnitKey(unit: string): string {
  return unit.toLowerCase().replace(/[\s.]/g, "");
}

/** Canonical code for a stored unit string, or null when it isn't a known unit. */
export function toMeasurementUnit(unit: string): MeasurementUnit | null {
  return UNIT_ALIASES[collapseUnitKey(unit)] ?? null;
}

/**
 * Display label for a stored unit in the active locale. Unrecognised values are
 * returned untouched — a unit we can't classify (e.g. "щіпка", "bunch") is still
 * meaningful to the reader, so it must never be dropped or mangled.
 */
export function unitLabel(unit: string, locale: Locale): string {
  const canonical = toMeasurementUnit(unit);
  return canonical ? MEASUREMENT_UNITS[canonical][locale] : unit;
}
