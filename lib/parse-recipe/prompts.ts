export function buildWebPrompt(
  textContent: string,
  userComment?: string,
): string {
  return `You are a strict recipe data extraction expert. Extract structured recipe data from the provided <webpage_content>.

RULES:
- If a field cannot be logically found, output null — never guess or fabricate.
- Times (prepTime, cookTime) MUST be integers representing minutes (e.g., 1 hour 30 mins -> 90).
- For ingredients: isolate amount, unit, and item name. Convert fractions to decimals (e.g., "1 1/2" -> 1.5, "¼" -> 0.25).
- For servings: if a range is given (e.g., "4-6"), extract the lower bound integer (4).
- For instructions: extract in correct order, keep original wording, remove blog commentary.
- imageUrl: ONLY the primary hero image URL.
- If an ingredient appears without an amount, set amount to null and unit to null — do not invent "1".
- cookTime: look for patterns like "35 хв", "1 год 30 хв", "45 minutes" near the recipe title. Convert to minutes.
- category: pick the single best fit: Breakfast, Lunch, Dinner, Soup, Salad, Snack, Dessert, Baking, Drink, Other. Never null.
- instructions: match [STEP IMAGE] entries from PAGE IMAGES to steps by order. Set imageUrl if a match exists, otherwise null.
${userComment ? `\nUSER OVERRIDE (CRITICAL): ${userComment}\n` : ""}
OUTPUT this exact JSON:
{
  "title": "string",
  "description": "string | null",
  "prepTime": "number | null",
  "cookTime": "number | null",
  "servings": "number | null",
  "category": "Breakfast | Lunch | Dinner | Soup | Salad | Snack | Dessert | Baking | Drink | Other",
  "ingredients": [{ "amount": "number | null", "unit": "string | null", "item": "string" }],
  "instructions": [{ "order": "number", "instruction": "string", "imageUrl": "string | null" }],
  "imageUrl": "string | null"
}

IMPORTANT: Ukrainian format — ingredients appear as "item — amount unit" (e.g., "Фетучині — 250 г"). Extract item name first, then amount and unit after the dash. Also handle ingredients embedded in step text.

<webpage_content>
${textContent}
</webpage_content>`;
}

export function buildTranscriptPrompt(
  transcript: string,
  caption?: string,
  userComment?: string,
): string {
  const override = userComment
    ? `USER OVERRIDE (CRITICAL — highest priority): ${userComment}\n\n`
    : "";

  const captionSection = caption
    ? `<caption>
${caption}
</caption>

`
    : "";

  const transcriptSection = transcript
    ? `<transcript>
${transcript}
</transcript>

`
    : "";

  const sourceNote =
    !transcript && caption
      ? "Note: No speech was detected in this video. Extract the recipe entirely from the caption.\n\n"
      : transcript && caption
        ? "IMPORTANT: Caption often contains exact ingredient amounts — prioritize it for ingredients. Use transcript for cooking steps.\n\n"
        : "";

  return `${override}Extract a recipe from this Instagram Reel.

${sourceNote}${captionSection}${transcriptSection}Return ONLY valid JSON matching this exact schema:
{
  "title": "string — infer from content if not stated explicitly",
  "description": "string | null",
  "prepTime": "integer minutes | null",
  "cookTime": "integer minutes | null",
  "servings": "integer — lower bound if range | null",
  "category": "one of: Breakfast, Lunch, Dinner, Soup, Salad, Snack, Dessert, Baking, Drink, Other",
  "ingredients": [{ "amount": "number | null", "unit": "string | null", "item": "string" }],
  "instructions": [{ "order": "integer", "instruction": "string", "imageUrl": null }],
  "imageUrl": null
}

Rules:
- ingredients: use caption amounts if available, transcript as fallback. Fractions to decimals (1½ → 1.5, ¼ → 0.25)
- instructions: from transcript steps. If no transcript, infer logical steps from caption
- title: infer from what dish is being made
- times: integers in minutes. null if not mentioned
- servings: lower bound if range. null if not mentioned
- category: always pick the closest match, never null
- null for missing fields, never fabricate
- return ONLY the JSON object, no markdown fences`;
}
