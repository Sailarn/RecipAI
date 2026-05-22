import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ingredients } from "@/db/schema/ingredients";
import { auth } from "@/lib/auth";
import { callGeminiForIngredient } from "@/lib/gemini";

function buildEnrichmentPrompt(
  rawText: string,
  ua?: string,
  category?: string,
): string {
  return `You are a culinary data specialist. Given an ingredient string, return a single JSON object. Output only the JSON, no surrounding text.

Schema: { "en": string, "ua": string, "category": string, "aliasesEn": string[], "aliasesUa": string[] }

Rules:
- en: canonical English name, lowercase singular
- ua: real Ukrainian word, nominative singular (NOT Russian, NOT transliterated)
- category: one of fruit|vegetable|meat|seafood|dairy|egg|grain|legume|nut|seed|oil|spice|herb|sauce|sweetener|alcohol|other
- aliasesUa: must include nominative plural, genitive singular, genitive plural, accusative singular
- aliasesEn: common English synonyms and plural forms
- If not a food ingredient, return: {"skip": true}

Ingredient string: "${rawText}"
${ua ? `Suggested Ukrainian translation (verify and correct if needed): "${ua}"` : ""}
${category ? `Suggested category: "${category}"` : ""}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id, rawText, ua, category } = body as {
    id?: string;
    rawText?: string;
    ua?: string;
    category?: string;
  };

  if (!id || !rawText) {
    return NextResponse.json(
      { error: "id and rawText are required" },
      { status: 400 },
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(ingredients)
    .where(eq(ingredients.id, id));
  const entry = rows[0];

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (entry.status === "confirmed") {
    return NextResponse.json({ success: true });
  }

  const prompt = buildEnrichmentPrompt(rawText, ua, category);

  try {
    const result = await callGeminiForIngredient(prompt);

    if (result.skip === true) {
      await db
        .update(ingredients)
        .set({ status: "failed" })
        .where(eq(ingredients.id, id));
      return NextResponse.json({ success: true });
    }

    await db
      .update(ingredients)
      .set({
        en: result.en as string,
        ua: result.ua as string,
        category: result.category as string,
        aliasesEn: result.aliasesEn as string[],
        aliasesUa: result.aliasesUa as string[],
        status: "confirmed",
        retryCount: 0,
        lastAttemptAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(ingredients.id, id));

    return NextResponse.json({ success: true });
  } catch {
    const newRetryCount = (entry.retryCount ?? 0) + 1;

    await db
      .update(ingredients)
      .set({
        retryCount: newRetryCount,
        lastAttemptAt: new Date(),
        ...(newRetryCount >= 3 ? { status: "failed" } : {}),
      })
      .where(eq(ingredients.id, id));

    return NextResponse.json(
      { error: "Gemini enrichment failed" },
      { status: 500 },
    );
  }
}
