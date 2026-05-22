interface VocabEntry {
  id: string;
  en: string;
  ua: string;
  category: string;
  aliasesEn: string[];
  aliasesUa: string[];
}

interface RecipeIngredientFile {
  unique: string[];
  byRecipe: Array<{ id: string; title: string; items: string[] }>;
}

const vocab = (await Bun.file(
  "scripts/ingredients-seed.json",
).json()) as VocabEntry[];
const { unique: ingredientStrings, byRecipe } = (await Bun.file(
  "scripts/recipe-ingredients.json",
).json()) as RecipeIngredientFile;

// Build a searchable token set from all vocabulary terms
const allVocabTerms = new Set<string>();
for (const entry of vocab) {
  allVocabTerms.add(entry.en.toLowerCase());
  allVocabTerms.add(entry.ua.toLowerCase());
  for (const a of entry.aliasesEn) allVocabTerms.add(a.toLowerCase());
  for (const a of entry.aliasesUa) allVocabTerms.add(a.toLowerCase());
}

// Strip amounts, units, and punctuation — extract candidate noun tokens
const UNIT_PATTERNS =
  /\b(\d+[\d.,/]*|\d*[½¼¾⅓⅔]|ст\.?\s*л\.?|ч\.?\s*л\.?|г|кг|мл|л|шт\.?|пучок|жменя|щіпка|за смаком|to taste|cup|tbsp|tsp|oz|lb|g|kg|ml)\b/gi;

function tokenize(raw: string): string[] {
  return raw
    .replace(UNIT_PATTERNS, " ")
    .replace(/[()[\]{},.:;!?0-9"'«»]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 3);
}

function isCovered(ingredientString: string): boolean {
  // 1. Exact match on full string (lowercased)
  if (allVocabTerms.has(ingredientString.toLowerCase())) return true;

  // 2. Any token from the ingredient string appears as a vocab term
  const tokens = tokenize(ingredientString);
  for (const token of tokens) {
    if (allVocabTerms.has(token)) return true;
  }

  // 3. Any vocab term appears as a substring of the ingredient string
  const lower = ingredientString.toLowerCase();
  for (const term of allVocabTerms) {
    if (term.length >= 4 && lower.includes(term)) return true;
  }

  return false;
}

const covered: string[] = [];
const uncovered: string[] = [];

for (const item of ingredientStrings) {
  if (isCovered(item)) {
    covered.push(item);
  } else {
    uncovered.push(item);
  }
}

const pct = ((covered.length / ingredientStrings.length) * 100).toFixed(1);

console.log(`Vocabulary entries:      ${vocab.length}`);
console.log(`Unique recipe strings:   ${ingredientStrings.length}`);
console.log(`Covered:                 ${covered.length} (${pct}%)`);
console.log(`Uncovered:               ${uncovered.length}`);

if (uncovered.length > 0) {
  console.log("\nUncovered ingredient strings:");
  for (const item of uncovered) {
    console.log(`  - ${item}`);
  }

  // Also show which recipes contain uncovered items
  const uncoveredSet = new Set(uncovered);
  console.log("\nRecipes with uncovered ingredients:");
  for (const recipe of byRecipe) {
    const missing = recipe.items.filter((i) => uncoveredSet.has(i));
    if (missing.length > 0) {
      console.log(`  "${recipe.title}":`);
      for (const m of missing) console.log(`    - ${m}`);
    }
  }
}

process.exit(uncovered.length > 0 ? 1 : 0);
