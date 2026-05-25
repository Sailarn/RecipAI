import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ingredients } from "@/db/schema/ingredients";
import { pantry } from "@/db/schema/pantry";
import { auth } from "@/lib/auth";
import type { PantryItem, VocabularyIngredient } from "@/lib/db/schema";

export async function GET(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(pantry)
    .where(eq(pantry.userId, session.user.id));

  const items: PantryItem[] = rows.map((r) => ({
    id: r.id,
    ingredientId: r.ingredientId ?? undefined,
    name: r.name,
    qty: r.qty,
    unit: r.unit,
    cat: r.cat,
    on: r.on,
    addedAt: r.addedAt,
  }));

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Partial<PantryItem> & {
    ingredientData?: VocabularyIngredient | null;
  };
  const { id, ingredientId, name, qty, unit, cat, on, ingredientData } = body;

  if (!id || !name || qty === undefined || !unit || !cat || on === undefined) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

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
        status: ingredientData.status ?? "provisional",
        retryCount: ingredientData.retryCount ?? 0,
        lastAttemptAt: ingredientData.lastAttemptAt
          ? new Date(ingredientData.lastAttemptAt)
          : null,
      })
      .onConflictDoNothing();
  }

  await db
    .insert(pantry)
    .values({
      id,
      userId: session.user.id,
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
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = (await req.json()) as { id: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db
    .delete(pantry)
    .where(and(eq(pantry.id, id), eq(pantry.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}
