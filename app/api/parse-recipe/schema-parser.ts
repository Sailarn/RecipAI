import * as cheerio from "cheerio";
import { RECIPE_CATEGORIES, type RecipeCategory } from "@/lib/categories";
import { logger } from "@/lib/logger";

const DEFAULT_SERVINGS = 4;

const CATEGORY_KEYWORDS: Array<[RecipeCategory, RegExp]> = [
  ["Soup", /суп|борщ|юшка|бульйон|soup|broth|bisque|chowder/i],
  ["Salad", /салат|salad/i],
  ["Breakfast", /сніданок|ранков|breakfast|brunch/i],
  ["Dessert", /десерт|торт|тістечк|морозив|пудинг|cake|dessert|cookie/i],
  ["Baking", /випічк|хліб|булочк|baking|bread|muffin|pastry/i],
  ["Drink", /напій|коктейл|смузі|drink|juice|smoothie|cocktail|beverage/i],
  ["Snack", /закуск|снек|перекус|snack|appetizer|starter/i],
  ["Lunch", /обід|lunch/i],
  ["Dinner", /вечеря|dinner|м'яс|рибн|птиц|main course/i],
];

type JsonLdNode = Record<string, unknown>;

interface SchemaIngredient {
  amount?: number;
  unit?: string;
  item: string;
}

interface SchemaInstruction {
  order: number;
  instruction: string;
  imageUrl?: string;
}

interface SchemaRecipe {
  title: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings: number;
  ingredients: SchemaIngredient[];
  instructions: SchemaInstruction[];
  imageUrl?: string;
  sourceUrl?: string;
  category?: string;
}

function normalizeCategoryToEnglish(raw: string | undefined): string {
  if (!raw) return "Other";
  const normalized = raw.trim();
  const exact = RECIPE_CATEGORIES.find(
    (candidate) => candidate.toLowerCase() === normalized.toLowerCase(),
  );
  if (exact) return exact;
  for (const [category, pattern] of CATEGORY_KEYWORDS) {
    if (pattern.test(normalized)) return category;
  }
  return "Other";
}

/**
 * Parse ISO 8601 duration to minutes
 * Examples: "PT30M" = 30, "PT1H30M" = 90, "P1DT2H" = 1560
 */
function parseDuration(duration: unknown): number | undefined {
  if (!duration) return undefined;
  if (typeof duration === "number") return duration;
  if (typeof duration !== "string") return undefined;

  // PT1H30M, PT30M, P0DT1H
  const match = duration.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/);
  if (!match) return undefined;

  const days = parseInt(match[1] || "0", 10);
  const hours = parseInt(match[2] || "0", 10);
  const minutes = parseInt(match[3] || "0", 10);

  return days * 24 * 60 + hours * 60 + minutes || undefined;
}

/** Parse a numeric or fraction string, e.g. "2", "1/2" → 2, 0.5. */
function parseAmount(amountStr: string): number | undefined {
  let amount: number;
  if (amountStr.includes("/")) {
    const [numerator, denominator] = amountStr.split("/").map(Number);
    amount = numerator / denominator;
  } else {
    amount = parseFloat(amountStr);
  }
  return Number.isNaN(amount) ? undefined : amount;
}

/**
 * Parse ingredient string to structured format
 * Examples:
 * "2 cups flour" → {amount: 2, unit: "cups", item: "flour"}
 * "Salt to taste" → {amount: undefined, unit: undefined, item: "Salt to taste"}
 */
function parseIngredient(ingredientString: string): SchemaIngredient {
  // Normalize unicode fractions and comma decimals
  const normalized = ingredientString
    .replace(/½/g, "0.5")
    .replace(/¼/g, "0.25")
    .replace(/¾/g, "0.75")
    .replace(/⅓/g, "0.33")
    .replace(/⅔/g, "0.67")
    .replace(/(\d),(\d)/g, "$1.$2");

  // Pattern 1: "item — amount unit" (Ukrainian style e.g. "Фетучині — 250 г")
  const ukrainianMatch = normalized.match(
    /^(.+?)\s*[—–-]+\s*([\d./]+)\s*([а-яА-ЯіІїЇєЄa-zA-Z.]+)?$/,
  );
  if (ukrainianMatch) {
    const [, item, amountStr, unit] = ukrainianMatch;
    return {
      amount: parseAmount(amountStr),
      unit: unit?.trim() || undefined,
      item: item.trim(),
    };
  }

  // Pattern 2: standard "amount unit item"
  const standardMatch = normalized.match(
    /^([\d./]+)\s+([a-zA-Zа-яА-ЯіІїЇєЄ.]+\.?)\s+(.+)$/,
  );
  if (standardMatch) {
    const [, amountStr, unit, item] = standardMatch;
    return {
      amount: parseAmount(amountStr),
      unit: unit.trim(),
      item: item.trim(),
    };
  }

  return { amount: undefined, unit: undefined, item: ingredientString.trim() };
}

function isRecipeNode(item: unknown): item is JsonLdNode {
  if (typeof item !== "object" || item === null) return false;
  const type = (item as JsonLdNode)["@type"];
  return type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
}

/** Find the Recipe node in a parsed JSON-LD block, unwrapping @graph. */
function findRecipeNode(data: unknown): JsonLdNode | undefined {
  const graph =
    typeof data === "object" && data !== null
      ? (data as JsonLdNode)["@graph"]
      : undefined;
  const items = Array.isArray(graph)
    ? graph
    : Array.isArray(data)
      ? data
      : [data];
  return items.find(isRecipeNode);
}

function extractServings(recipe: JsonLdNode): number {
  const raw = Array.isArray(recipe.recipeYield)
    ? recipe.recipeYield[0]
    : recipe.recipeYield;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const match = raw.match(/\d+/);
    if (match) return parseInt(match[0], 10);
  }
  return DEFAULT_SERVINGS;
}

function extractIngredients(recipe: JsonLdNode): SchemaIngredient[] {
  if (!Array.isArray(recipe.recipeIngredient)) return [];
  return recipe.recipeIngredient.map((entry) => parseIngredient(String(entry)));
}

/** Pull a usable image URL from a string, array, or { url } object. */
function firstImageUrl(image: unknown): string | undefined {
  if (typeof image === "string") return image;
  if (Array.isArray(image)) {
    const first = image[0];
    return typeof first === "string" ? first : undefined;
  }
  if (typeof image === "object" && image !== null) {
    const url = (image as JsonLdNode).url;
    if (typeof url === "string") return url;
  }
  return undefined;
}

function stepText(node: JsonLdNode): string {
  if (typeof node.text === "string") return node.text;
  if (node["@type"] === "HowToStep" && typeof node.name === "string") {
    return node.name;
  }
  return "";
}

function parseInstructionStep(step: unknown, index: number): SchemaInstruction {
  const order = index + 1;
  if (typeof step === "string") {
    return { order, instruction: step.trim() };
  }
  if (typeof step === "object" && step !== null) {
    const node = step as JsonLdNode;
    const imageUrl =
      node["@type"] === "HowToStep" ? firstImageUrl(node.image) : undefined;
    return { order, instruction: stepText(node).trim(), imageUrl };
  }
  return { order, instruction: "" };
}

function splitStringInstructions(text: string): SchemaInstruction[] {
  return text
    .split(/\n+|(?<=\.)\s+/)
    .filter((segment) => segment.trim().length > 0)
    .map((segment, index) => ({
      order: index + 1,
      instruction: segment.trim(),
    }));
}

function extractInstructions(recipe: JsonLdNode): SchemaInstruction[] {
  const raw = recipe.recipeInstructions;
  if (Array.isArray(raw)) return raw.map(parseInstructionStep);
  if (typeof raw === "string") return splitStringInstructions(raw);
  return [];
}

function extractCategory(recipe: JsonLdNode): string | undefined {
  if (!recipe.recipeCategory) return undefined;
  const raw = Array.isArray(recipe.recipeCategory)
    ? recipe.recipeCategory[0]
    : recipe.recipeCategory;
  return normalizeCategoryToEnglish(typeof raw === "string" ? raw : undefined);
}

function buildSchemaRecipe(recipe: JsonLdNode): SchemaRecipe {
  return {
    title: typeof recipe.name === "string" ? recipe.name : "",
    description:
      typeof recipe.description === "string" ? recipe.description : undefined,
    prepTime: parseDuration(recipe.prepTime),
    cookTime: parseDuration(recipe.cookTime),
    servings: extractServings(recipe),
    ingredients: extractIngredients(recipe),
    instructions: extractInstructions(recipe),
    imageUrl: firstImageUrl(recipe.image),
    category: extractCategory(recipe),
  };
}

function findRecipeInScript(scriptContent: string): JsonLdNode | undefined {
  try {
    return findRecipeNode(JSON.parse(scriptContent));
  } catch (error) {
    logger.error("Error parsing JSON-LD:", error);
    return undefined;
  }
}

/**
 * Extract recipe from schema.org JSON-LD
 */
export function extractSchemaRecipe(html: string): SchemaRecipe | null {
  const $ = cheerio.load(html);
  const jsonLdScripts = $('script[type="application/ld+json"]');

  for (const script of jsonLdScripts.toArray()) {
    const scriptContent = $(script).html();
    if (!scriptContent) continue;

    const recipe = findRecipeInScript(scriptContent);
    if (recipe) return buildSchemaRecipe(recipe);
  }

  return null;
}
