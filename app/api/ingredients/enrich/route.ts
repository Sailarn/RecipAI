import { and, eq, ne, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ingredients } from "@/db/schema/ingredients";
import { pantry } from "@/db/schema/pantry";
import { callAiForIngredient } from "@/lib/ai";
import { ApiError } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/require-session";
import { INGREDIENT_STATUS, type IngredientStatus } from "@/lib/db/schema";
import { embed } from "@/lib/embed";
import { log } from "@/lib/telemetry";

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
  const authed = await requireSession();
  if (authed.response) return authed.response;

  let body: { id?: string; rawText?: string; ua?: string; category?: string };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { id, rawText, ua, category } = body;
  if (!id || !rawText)
    return ApiError.badRequest("id and rawText are required");

  // Upsert provisional first — the client fires create and enrich in parallel,
  // so the ingredient may not exist in Supabase yet when this handler runs.
  let entry:
    | { retryCount: number | null; status: IngredientStatus }
    | undefined;
  try {
    await db
      .insert(ingredients)
      .values({
        id,
        en: rawText,
        ua: ua ?? null,
        category: category ?? "other",
        aliasesEn: [],
        aliasesUa: [],
        status: INGREDIENT_STATUS.PROVISIONAL,
      })
      .onConflictDoNothing();

    const rows = await db
      .select()
      .from(ingredients)
      .where(eq(ingredients.id, id));
    entry = rows[0];
  } catch (error) {
    return ApiError.internal(error, req);
  }

  if (!entry) return ApiError.notFound("Ingredient not found");
  if (entry.status === INGREDIENT_STATUS.CONFIRMED)
    return NextResponse.json({ success: true });

  const prompt = buildEnrichmentPrompt(rawText, ua, category);

  try {
    const result = await callAiForIngredient(prompt);

    if (result.skip === true) {
      await db
        .update(ingredients)
        .set({ status: INGREDIENT_STATUS.FAILED })
        .where(eq(ingredients.id, id));
      return NextResponse.json({ success: true });
    }

    const enriched = {
      en: result.en as string,
      ua: result.ua as string,
      category: result.category as string,
      aliasesEn: result.aliasesEn as string[],
      aliasesUa: result.aliasesUa as string[],
    };

    // If a confirmed canonical of the same name already exists, merge into it
    // rather than confirming a second row. Prefer slug ids (non-UUID format)
    // over UUID provisionals so the richest entry wins.
    const existingCanonical = await db
      .select({ id: ingredients.id })
      .from(ingredients)
      .where(
        and(
          sql`lower(trim(${ingredients.en})) = lower(trim(${enriched.en}))`,
          eq(ingredients.status, INGREDIENT_STATUS.CONFIRMED),
          ne(ingredients.id, id),
        ),
      )
      .orderBy(sql`(${ingredients.id} ~ '^[a-zA-Z]') DESC`)
      .limit(1);

    if (existingCanonical.length > 0) {
      const canonicalId = existingCanonical[0].id;
      await db.transaction(async (tx) => {
        await tx
          .update(pantry)
          .set({ ingredientId: canonicalId })
          .where(eq(pantry.ingredientId, id));

        await tx.execute(sql`
          UPDATE recipes
          SET canonical_ingredient_ids = (
            SELECT jsonb_agg(
              CASE WHEN elem #>> '{}' = ${id}
              THEN to_jsonb(${canonicalId}::text)
              ELSE elem
              END
            )
            FROM jsonb_array_elements(canonical_ingredient_ids) elem
          )
          WHERE canonical_ingredient_ids @> ${JSON.stringify([id])}::jsonb
        `);

        await tx.delete(ingredients).where(eq(ingredients.id, id));
      });

      log("info", "enrich_merged", {
        provisionalId: id,
        canonicalId,
        userId: authed.session.user.id,
      });
      return NextResponse.json({ success: true, mergedInto: canonicalId });
    }

    // Confirm the enriched row first, without the vector, so a malformed vector
    // or a vector-column write failure can never reject the confirm or bump
    // enrichment retry state.
    await db
      .update(ingredients)
      .set({
        ...enriched,
        status: INGREDIENT_STATUS.CONFIRMED,
        retryCount: 0,
        lastAttemptAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(ingredients.id, id));

    // The passage vector is a best-effort follow-up. On compute or write
    // failure the row stays confirmed with a null embedding — a detectable gap
    // a later repair pass fills — rather than failing enrichment.
    let passageEmbedding: number[] | undefined;
    try {
      const [vector] = await embed([enriched.en], "passage");
      passageEmbedding = vector;
    } catch {
      log("warn", "enrich_embed_skipped", { ingredientId: id });
    }
    if (passageEmbedding) {
      try {
        await db
          .update(ingredients)
          .set({ embedding: passageEmbedding, updatedAt: new Date() })
          .where(eq(ingredients.id, id));
      } catch {
        log("warn", "enrich_embed_persist_failed", { ingredientId: id });
      }
    }

    log("info", "enrich_completed", {
      ingredientId: id,
      userId: authed.session.user.id,
    });
    return NextResponse.json({ success: true, ingredient: enriched });
  } catch (error) {
    const newRetryCount = (entry.retryCount ?? 0) + 1;

    await db
      .update(ingredients)
      .set({
        retryCount: newRetryCount,
        lastAttemptAt: new Date(),
        ...(newRetryCount >= 3 ? { status: INGREDIENT_STATUS.FAILED } : {}),
      })
      .where(eq(ingredients.id, id));

    return ApiError.internal(error, req, "Gemini enrichment failed");
  }
}
