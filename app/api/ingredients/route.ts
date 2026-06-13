import { and, eq, gt } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ingredients } from "@/db/schema/ingredients";
import { ApiError } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/require-session";
import { INGREDIENT_STATUS } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get("since");

  const conditions = [eq(ingredients.status, INGREDIENT_STATUS.CONFIRMED)];
  if (since) {
    const sinceDate = new Date(since);
    if (!Number.isNaN(sinceDate.getTime())) {
      conditions.push(gt(ingredients.updatedAt, sinceDate));
    }
  }

  try {
    const rows = await db
      .select({
        id: ingredients.id,
        en: ingredients.en,
        ua: ingredients.ua,
        category: ingredients.category,
        aliasesEn: ingredients.aliasesEn,
        aliasesUa: ingredients.aliasesUa,
        status: ingredients.status,
        retryCount: ingredients.retryCount,
        lastAttemptAt: ingredients.lastAttemptAt,
        embedding: ingredients.embedding,
        updatedAt: ingredients.updatedAt,
      })
      .from(ingredients)
      .where(and(...conditions));

    const serverMaxUpdatedAt =
      rows.length > 0
        ? rows
            .reduce(
              (max, row) => (row.updatedAt > max ? row.updatedAt : max),
              rows[0].updatedAt,
            )
            .toISOString()
        : (since ?? "");

    const result = rows.map(({ updatedAt: _updatedAt, ...rest }) => rest);

    return NextResponse.json({ ingredients: result, serverMaxUpdatedAt });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}

export async function POST(req: NextRequest) {
  const authed = await requireSession();
  if (authed.response) return authed.response;

  let body: { id?: string; en?: string; ua?: string | null; category?: string };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { id, en, ua, category } = body;
  if (!id || !en) return ApiError.badRequest("id and en required");

  try {
    await db
      .insert(ingredients)
      .values({
        id,
        en,
        ua: ua ?? null,
        category: category ?? "other",
        aliasesEn: [],
        aliasesUa: [],
        status: INGREDIENT_STATUS.PROVISIONAL,
      })
      .onConflictDoNothing();

    return NextResponse.json({ id });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
