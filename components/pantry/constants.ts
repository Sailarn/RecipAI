export const UNIT_OPTIONS = [
  "pcs",
  "g",
  "kg",
  "ml",
  "l",
  "tbsp",
  "tsp",
] as const;
export const CAT_OPTIONS = [
  "Produce",
  "Dairy",
  "Pantry",
  "Spices",
  "Frozen",
  "Other",
] as const;

export type UnitOption = (typeof UNIT_OPTIONS)[number];
export type CatOption = (typeof CAT_OPTIONS)[number];

const VOCAB_CATEGORY_MAP: Record<string, CatOption> = {
  Produce: "Produce",
  Vegetable: "Produce",
  Fruit: "Produce",
  Dairy: "Dairy",
  "Dairy & Eggs": "Dairy",
  Meat: "Other",
  Seafood: "Other",
  Grain: "Pantry",
  Legume: "Pantry",
  Spice: "Spices",
  Herb: "Spices",
  Oil: "Pantry",
  Sauce: "Pantry",
  Sweetener: "Pantry",
  Frozen: "Frozen",
  Other: "Other",
};

export function mapVocabCategory(vocabCat: string): CatOption | null {
  return VOCAB_CATEGORY_MAP[vocabCat] ?? null;
}
