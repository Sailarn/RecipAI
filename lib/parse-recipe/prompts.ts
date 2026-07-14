import type { SocialContent } from "@/lib/scrapers/apify";
import { modifierPromptList } from "./modifiers";

const NOT_RECIPE_RULE =
  'FIRST determine whether the input contains an actual recipe. If not, return {"notRecipe": true} and nothing else.';

export function buildWebPrompt(textContent: string): string {
  return `You are a strict recipe data extraction expert. Extract structured recipe data from the provided <webpage_content>.

${NOT_RECIPE_RULE}

RULES:
- If a field cannot be logically found, output null — never guess or fabricate.
- Times (prepTime, cookTime) MUST be integers representing minutes (e.g., 1 hour 30 mins -> 90).
- For ingredients: isolate amount, unit, and item name. Convert fractions to decimals (e.g., "1 1/2" -> 1.5, "¼" -> 0.25).
- For servings: if a range is given (e.g., "4-6"), extract the lower bound integer (4).
- For instructions: extract in correct order, keep original wording, remove blog commentary.
- imageUrl: ONLY the primary hero image URL.
- If an ingredient appears without an amount, set amount to null and unit to null — do not invent "1".
- If an ingredient string is not a food item (equipment, paper towels, etc.), omit it from the ingredients array entirely.
- cookTime: look for patterns like "35 хв", "1 год 30 хв", "45 minutes" near the recipe title. Convert to minutes.
- category: pick the single best fit: Breakfast, Lunch, Dinner, Soup, Salad, Snack, Dessert, Baking, Drink, Other. Never null.
- instructions: match [STEP IMAGE] entries from PAGE IMAGES to steps by order. Set imageUrl if a match exists, otherwise null.
- modifiers: choose zero or one modifier per ingredient, only from the provided list. Move the closest matched preparation/state phrase out of item into modifiers, but keep the full original wording in original.
- sections: assign a section only when the recipe clearly has distinct parts (dough vs filling, sauce vs main). Reuse the EXACT same label string on both the ingredients and the steps of that part. For a single flat list, set section to null everywhere.
OUTPUT this exact JSON:
{
  "title": "string",
  "description": "string | null",
  "prepTime": "number | null",
  "cookTime": "number | null",
  "servings": "number | null",
  "category": "Breakfast | Lunch | Dinner | Soup | Salad | Snack | Dessert | Baking | Drink | Other",
  "ingredients": [{ "amount": "number | null", "unit": "string | null", "item": "string — the ingredient NAME with any preparation/state words that map to modifiers below REMOVED; keep size and other descriptors ("2 small zucchini, sliced" → "small zucchini", "grated mozzarella" → "mozzarella")", "modifiers": "array containing zero or one KEY from: ${modifierPromptList()}, e.g. ["GRATED"] or []. Pick a KEY from this list ONLY; never invent one.", "original": "string | null — the ingredient text EXACTLY as written in the source (name plus any modifier word); null if identical to item", "section": "string | null — short label grouping this ingredient with related steps (e.g. "For the base", "Sauce", "Marinade"); null if the recipe has no distinct parts. Use the SAME label text on the matching instructions.", "ua": "string | null — Ukrainian translation of the ingredient name", "en": "string — canonical English HEAD noun for matching only: singular, no quantity/size/prep/brand words ("shredded mozzarella"→"mozzarella", "2 small zucchini"→"zucchini", "розтоплене масло"→"butter"); use the generic head when nothing specific fits ("shredded cheese"→"cheese").", "category": "one of: fruit|vegetable|meat|seafood|dairy|egg|grain|legume|nut|seed|oil|spice|herb|sauce|sweetener|alcohol|other | null" }],
  "instructions": [{ "order": "number", "instruction": "string", "section": "string | null — same label set used on ingredients; null if no distinct parts", "imageUrl": "string | null" }],
  "imageUrl": "string | null"
}

IMPORTANT: Ukrainian format — ingredients appear as "item — amount unit" (e.g., "Фетучині — 250 г"). Extract item name first, then amount and unit after the dash. Also handle ingredients embedded in step text.

<webpage_content>
${textContent}
</webpage_content>`;
}

export function buildPhotoPrompt(): string {
  return `You are a recipe extraction expert. Extract a structured recipe from this photo of a handwritten or printed recipe card.

${NOT_RECIPE_RULE}

RULES:
- The recipe may be in any language including Ukrainian, Russian, or English — extract text as-is, do NOT translate.
- If the image contains a recipe but some handwriting is unclear, make your best-effort guess.
- times (prepTime, cookTime): extract as integers in minutes (e.g. "1 год 30 хв" → 90). null if not found.
- servings: integer. Default to 4 if not stated.
- category: pick the single best fit from: Breakfast, Lunch, Dinner, Soup, Salad, Snack, Dessert, Baking, Drink, Other. Never null.
- ingredients: isolate amount, unit, and item. Convert fractions to decimals (e.g. "1½" → 1.5, "¼" → 0.25). If no amount, set amount and unit to null. If an ingredient string is not a food item (equipment, paper towels, etc.), omit it from the ingredients array entirely.
- instructions: extract steps in correct order. Keep original wording.
- modifiers: choose zero or one modifier per ingredient, only from the provided list. Move the closest matched preparation/state phrase out of item into modifiers, but keep the full original wording in original.
- sections: assign a section only when the recipe clearly has distinct parts (dough vs filling, sauce vs main). Reuse the EXACT same label string on both the ingredients and the steps of that part. For a single flat list, set section to null everywhere.
- imageUrl: always null (we do not store the photo itself).
- sourceUrl: always null.

Return ONLY valid JSON matching this exact schema:
{
  "title": "string",
  "description": "string | null",
  "prepTime": "integer | null",
  "cookTime": "integer | null",
  "servings": "integer",
  "category": "Breakfast | Lunch | Dinner | Soup | Salad | Snack | Dessert | Baking | Drink | Other",
  "ingredients": [{ "amount": "number | null", "unit": "string | null", "item": "string — the ingredient NAME with any preparation/state words that map to modifiers below REMOVED; keep size and other descriptors ("2 small zucchini, sliced" → "small zucchini", "grated mozzarella" → "mozzarella")", "modifiers": "array containing zero or one KEY from: ${modifierPromptList()}, e.g. ["GRATED"] or []. Pick a KEY from this list ONLY; never invent one.", "original": "string | null — the ingredient text EXACTLY as written in the source (name plus any modifier word); null if identical to item", "section": "string | null — short label grouping this ingredient with related steps (e.g. "For the base", "Sauce", "Marinade"); null if the recipe has no distinct parts. Use the SAME label text on the matching instructions.", "ua": "string | null — Ukrainian translation of the ingredient name", "en": "string — canonical English HEAD noun for matching only: singular, no quantity/size/prep/brand words ("shredded mozzarella"→"mozzarella", "2 small zucchini"→"zucchini", "розтоплене масло"→"butter"); use the generic head when nothing specific fits ("shredded cheese"→"cheese").", "category": "one of: fruit|vegetable|meat|seafood|dairy|egg|grain|legume|nut|seed|oil|spice|herb|sauce|sweetener|alcohol|other | null" }],
  "instructions": [{ "order": "integer", "instruction": "string", "section": "string | null — same label set used on ingredients; null if no distinct parts", "imageUrl": null }],
  "imageUrl": null,
  "sourceUrl": null
}`;
}

export function buildSocialPrompt(
  content: Pick<SocialContent, "platform" | "caption" | "imageUrls">,
  transcript: string,
): string {
  const captionSection = content.caption
    ? `<caption>
${content.caption}
</caption>

`
    : "";

  const transcriptSection = transcript
    ? `<transcript>
${transcript}
</transcript>

`
    : "";

  const imageSection = content.imageUrls.length
    ? `<post_images>
${content.imageUrls.map((imageUrl) => `- ${imageUrl}`).join("\n")}
</post_images>

`
    : "";

  const sourceNote =
    !transcript && content.caption
      ? "Note: No transcript was available. Extract the recipe from the caption and post images.\n\n"
      : transcript && content.caption
        ? "IMPORTANT: Caption often contains exact ingredient amounts — prioritize it for ingredients. Use transcript for cooking steps.\n\n"
        : "";

  return `Extract a recipe from this ${content.platform} social post.

${NOT_RECIPE_RULE}

${sourceNote}${captionSection}${transcriptSection}${imageSection}Return ONLY valid JSON matching this exact schema:
{
  "title": "string — infer from content if not stated explicitly",
  "description": "string | null",
  "prepTime": "integer minutes | null",
  "cookTime": "integer minutes | null",
  "servings": "integer — lower bound if range | null",
  "category": "one of: Breakfast, Lunch, Dinner, Soup, Salad, Snack, Dessert, Baking, Drink, Other",
  "ingredients": [{ "amount": "number | null", "unit": "string | null", "item": "string — the ingredient NAME with any preparation/state words that map to modifiers below REMOVED; keep size and other descriptors ("2 small zucchini, sliced" → "small zucchini", "grated mozzarella" → "mozzarella")", "modifiers": "array containing zero or one KEY from: ${modifierPromptList()}, e.g. ["GRATED"] or []. Pick a KEY from this list ONLY; never invent one.", "original": "string | null — the ingredient text EXACTLY as written in the source (name plus any modifier word); null if identical to item", "section": "string | null — short label grouping this ingredient with related steps (e.g. "For the base", "Sauce", "Marinade"); null if the recipe has no distinct parts. Use the SAME label text on the matching instructions.", "ua": "string | null — Ukrainian translation of the ingredient name", "en": "string — canonical English HEAD noun for matching only: singular, no quantity/size/prep/brand words ("shredded mozzarella"→"mozzarella", "2 small zucchini"→"zucchini", "розтоплене масло"→"butter"); use the generic head when nothing specific fits ("shredded cheese"→"cheese").", "category": "one of: fruit|vegetable|meat|seafood|dairy|egg|grain|legume|nut|seed|oil|spice|herb|sauce|sweetener|alcohol|other | null" }],
  "instructions": [{ "order": "integer", "instruction": "string", "section": "string | null — same label set used on ingredients; null if no distinct parts", "imageUrl": null }],
  "imageUrl": null
}

Rules:
- ingredients: use caption amounts if available, transcript as fallback. Fractions to decimals (1½ → 1.5, ¼ → 0.25). If an ingredient string is not a food item (equipment, paper towels, etc.), omit it from the ingredients array entirely.
- instructions: from transcript steps. If no transcript, infer logical steps from caption and post image context
- modifiers: choose zero or one modifier per ingredient, only from the provided list. Move the closest matched preparation/state phrase out of item into modifiers, but keep the full original wording in original.
- sections: assign a section only when the recipe clearly has distinct parts (dough vs filling, sauce vs main). Reuse the EXACT same label string on both the ingredients and the steps of that part. For a single flat list, set section to null everywhere.
- title: infer from what dish is being made
- times: integers in minutes. null if not mentioned
- servings: lower bound if range. null if not mentioned
- category: always pick the closest match, never null
- null for missing fields, never fabricate
- return ONLY the JSON object, no markdown fences`;
}
