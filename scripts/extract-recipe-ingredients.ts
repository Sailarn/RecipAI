import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { db } from "../db/index";
import { recipes } from "../db/schema/recipes";

interface RecipeIngredient {
  id?: string;
  item: string;
  amount?: string;
  unit?: string;
}

const rows = await db
  .select({
    id: recipes.id,
    title: recipes.title,
    ingredients: recipes.ingredients,
  })
  .from(recipes);

const byRecipe: Array<{ id: string; title: string; items: string[] }> = [];
const allItems = new Set<string>();

for (const row of rows) {
  const items = (row.ingredients as RecipeIngredient[])
    .map((ing) => ing.item?.trim())
    .filter((item): item is string => Boolean(item));

  if (items.length > 0) {
    byRecipe.push({ id: row.id, title: row.title, items });
    for (const item of items) allItems.add(item);
  }
}

const unique = [...allItems].sort((a, b) => a.localeCompare(b, "uk"));

const output = { unique, byRecipe };

await Bun.write(
  "scripts/recipe-ingredients.json",
  JSON.stringify(output, null, 2),
);

console.log(`Recipes scanned:     ${rows.length}`);
console.log(`Recipes with items:  ${byRecipe.length}`);
console.log(`Unique item strings: ${unique.length}`);
console.log("Written → scripts/recipe-ingredients.json");

process.exit(0);
