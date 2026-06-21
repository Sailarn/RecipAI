export const CAT_OPTIONS = [
  "Produce",
  "Dairy",
  "Pantry",
  "Spices",
  "Frozen",
  "Other",
] as const;

export type CatOption = (typeof CAT_OPTIONS)[number];

const VOCAB_CATEGORY_MAP: Record<string, CatOption> = {
  produce: "Produce",
  vegetable: "Produce",
  fruit: "Produce",
  dairy: "Dairy",
  "dairy & eggs": "Dairy",
  egg: "Dairy",
  grain: "Pantry",
  legume: "Pantry",
  nut: "Pantry",
  oil: "Pantry",
  sauce: "Pantry",
  seed: "Pantry",
  sweetener: "Pantry",
  spice: "Spices",
  herb: "Spices",
  frozen: "Frozen",
  alcohol: "Other",
  meat: "Other",
  seafood: "Other",
  other: "Other",
};

export function mapVocabCategory(vocabularyCategory: string): CatOption | null {
  return VOCAB_CATEGORY_MAP[vocabularyCategory.trim().toLowerCase()] ?? null;
}
