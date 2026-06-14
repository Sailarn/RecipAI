import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ingredients } from "@/db/schema/ingredients";
import { pantry } from "@/db/schema/pantry";
import { ApiError } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/require-session";
import {
  INGREDIENT_STATUS,
  type PantryItem,
  type VocabularyIngredient,
} from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  const authed = await requireSession();
  if (authed.response) return authed.response;

  try {
    const rows = await db
      .select()
      .from(pantry)
      .where(eq(pantry.userId, authed.session.user.id));

    const items: PantryItem[] = rows.map((row) => ({
      id: row.id,
      ingredientId: row.ingredientId ?? undefined,
      name: row.name,
      qty: row.qty,
      unit: row.unit,
      cat: row.cat,
      on: row.on,
      addedAt: row.addedAt,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}

export async function POST(req: NextRequest) {
  const authed = await requireSession();
  if (authed.response) return authed.response;

  let body: Partial<PantryItem> & {
    ingredientData?: VocabularyIngredient | null;
  };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { id, ingredientId, name, qty, unit, cat, on, ingredientData } = body;

  if (!id || !name || qty === undefined || !unit || !cat || on === undefined) {
    return ApiError.badRequest("Missing required fields");
  }

  try {
    // Upsert the ingredient first so the pantry FK never fails.
    // Handles provisionals (not yet enriched) and canonical sync gaps.
    if (ingredientId && ingredientData) {
      await db
        .insert(ingredients)
        .values({
          id: ingredientData.id,
          en: ingredientData.en,
          ua: ingredientData.ua ?? null,
          category: ingredientData.category,
          aliasesEn: ingredientData.aliasesEn ?? [],
          aliasesUa: ingredientData.aliasesUa ?? [],
          status: ingredientData.status ?? INGREDIENT_STATUS.PROVISIONAL,
          retryCount: ingredientData.retryCount ?? 0,
          lastAttemptAt: ingredientData.lastAttemptAt
            ? new Date(ingredientData.lastAttemptAt)
            : null,
        })
        .onConflictDoNothing();
    }

    // Enforce one row per (user, ingredient): if this ingredient is already in
    // the user's pantry, update that row in place so re-adding never creates a
    // duplicate. The partial unique index is the hard backstop; this keeps the
    // existing row's id stable for sync. Free-text items (no ingredientId) skip
    // this and are inserted fresh.
    if (ingredientId) {
      const [existing] = await db
        .select({ id: pantry.id })
        .from(pantry)
        .where(
          and(
            eq(pantry.userId, authed.session.user.id),
            eq(pantry.ingredientId, ingredientId),
          ),
        );

      if (existing) {
        await db
          .update(pantry)
          .set({ name, qty, unit, cat, on })
          .where(eq(pantry.id, existing.id));
        return NextResponse.json({ ok: true });
      }
    }

    await db
      .insert(pantry)
      .values({
        id,
        userId: authed.session.user.id,
        ingredientId: ingredientId ?? null,
        name,
        qty,
        unit,
        cat,
        on,
        addedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: pantry.id,
        set: { ingredientId: ingredientId ?? null, name, qty, unit, cat, on },
      });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}

export async function DELETE(req: NextRequest) {
  const authed = await requireSession();
  if (authed.response) return authed.response;

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { id } = body;
  if (!id) return ApiError.badRequest("id required");

  try {
    await db
      .delete(pantry)
      .where(and(eq(pantry.id, id), eq(pantry.userId, authed.session.user.id)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
