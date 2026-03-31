import * as cheerio from "cheerio";

interface SchemaRecipe {
  title: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings: number;
  ingredients: Array<{
    amount?: number;
    unit?: string;
    item: string;
  }>;
  instructions: Array<{
    order: number;
    instruction: string;
  }>;
  imageUrl?: string;
  sourceUrl?: string;
  category?: string;
}

/**
 * Parse ISO 8601 duration to minutes
 * Examples: "PT30M" = 30, "PT1H30M" = 90, "P1DT2H" = 1560
 */
function parseDuration(duration?: string | number): number | undefined {
  if (!duration) return undefined;
  if (typeof duration === "number") return duration;

  // PT1H30M, PT30M, P0DT1H
  const match = duration.match(/(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return undefined;

  const days = parseInt(match[1] || "0", 10);
  const hours = parseInt(match[2] || "0", 10);
  const minutes = parseInt(match[3] || "0", 10);

  return days * 24 * 60 + hours * 60 + minutes || undefined;
}

/**
 * Parse ingredient string to structured format
 * Examples:
 * "2 cups flour" → {amount: 2, unit: "cups", item: "flour"}
 * "Salt to taste" → {amount: undefined, unit: undefined, item: "Salt to taste"}
 */
function parseIngredient(ingredientString: string): {
  amount?: number;
  unit?: string;
  item: string;
} {
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
    let amount: number | undefined;
    if (amountStr.includes("/")) {
      const [num, den] = amountStr.split("/").map(Number);
      amount = num / den;
    } else {
      amount = parseFloat(amountStr);
    }
    return {
      amount: Number.isNaN(amount) ? undefined : amount,
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
    let amount: number | undefined;
    if (amountStr.includes("/")) {
      const [num, den] = amountStr.split("/").map(Number);
      amount = num / den;
    } else {
      amount = parseFloat(amountStr);
    }
    return {
      amount: Number.isNaN(amount) ? undefined : amount,
      unit: unit.trim(),
      item: item.trim(),
    };
  }

  return { amount: undefined, unit: undefined, item: ingredientString.trim() };
}

/**
 * Extract recipe from schema.org JSON-LD
 */
export function extractSchemaRecipe(html: string): SchemaRecipe | null {
  const $ = cheerio.load(html);

  // Find all JSON-LD script tags
  const jsonLdScripts = $('script[type="application/ld+json"]');

  if (jsonLdScripts.length === 0) {
    return null;
  }

  // Try each JSON-LD block
  for (let i = 0; i < jsonLdScripts.length; i++) {
    try {
      const scriptContent = $(jsonLdScripts[i]).html();
      if (!scriptContent) continue;

      const data = JSON.parse(scriptContent);

      // Handle @graph wrapper (multiple items in one script)
      let items = Array.isArray(data) ? data : [data];
      if (data["@graph"]) {
        items = data["@graph"];
      }

      // Find Recipe type
      const recipe = items.find(
        (item: any) =>
          item["@type"] === "Recipe" || item["@type"]?.includes("Recipe"),
      );

      if (!recipe) continue;

      console.log("Raw schema recipe:", JSON.stringify(recipe, null, 2));

      // Extract servings (handle different formats)
      let servings = 4;
      if (recipe.recipeYield) {
        const raw = Array.isArray(recipe.recipeYield)
          ? recipe.recipeYield[0]
          : recipe.recipeYield;
        if (typeof raw === "number") {
          servings = raw;
        } else if (typeof raw === "string") {
          const match = raw.match(/\d+/);
          if (match) servings = parseInt(match[0], 10);
        }
      }

      // Extract ingredients
      let ingredients: Array<{ amount?: number; unit?: string; item: string }> =
        [];
      if (recipe.recipeIngredient) {
        ingredients = recipe.recipeIngredient.map((ing: string) =>
          parseIngredient(ing),
        );
      }

      // Extract instructions
      let instructions: Array<{ order: number; instruction: string }> = [];
      if (recipe.recipeInstructions) {
        const instructionData = recipe.recipeInstructions;

        if (Array.isArray(instructionData)) {
          instructions = instructionData.map((inst: any, idx: number) => {
            let text = "";

            if (typeof inst === "string") {
              text = inst;
            } else if (inst["@type"] === "HowToStep") {
              text = inst.text || inst.name || "";
            } else if (inst.text) {
              text = inst.text;
            }

            return {
              order: idx + 1,
              instruction: text.trim(),
            };
          });
        } else if (typeof instructionData === "string") {
          // Single string - split by newlines or periods
          instructions = instructionData
            .split(/\n+|(?<=\.)\s+/)
            .filter((s) => s.trim().length > 0)
            .map((text, idx) => ({
              order: idx + 1,
              instruction: text.trim(),
            }));
        }
      }

      // Extract image URL
      let imageUrl: string | undefined;
      if (recipe.image) {
        if (typeof recipe.image === "string") {
          imageUrl = recipe.image;
        } else if (Array.isArray(recipe.image)) {
          imageUrl = recipe.image[0];
        } else if (recipe.image.url) {
          imageUrl = recipe.image.url;
        }
      }

      let category: string | undefined;
      if (recipe.recipeCategory) {
        const raw = Array.isArray(recipe.recipeCategory)
          ? recipe.recipeCategory[0]
          : recipe.recipeCategory;
        category = typeof raw === "string" ? raw : undefined;
      }

      // Return parsed recipe
      return {
        title: recipe.name || "",
        description: recipe.description || undefined,
        prepTime: parseDuration(recipe.prepTime),
        cookTime: parseDuration(recipe.cookTime),
        servings,
        ingredients,
        instructions,
        imageUrl,
        category,
      };
    } catch (error) {
      console.error("Error parsing JSON-LD:", error);
    }
  }

  return null;
}
