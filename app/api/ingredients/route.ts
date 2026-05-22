import { and, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ingredients } from "@/db/schema/ingredients";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get("since");

  const conditions = [eq(ingredients.status, "confirmed")];
  if (since) {
    const sinceDate = new Date(since);
    if (!Number.isNaN(sinceDate.getTime())) {
      conditions.push(gt(ingredients.updatedAt, sinceDate));
    }
  }

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
      updatedAt: ingredients.updatedAt,
    })
    .from(ingredients)
    .where(and(...conditions));

  const serverMaxUpdatedAt =
    rows.length > 0
      ? rows
          .reduce(
            (max, r) => (r.updatedAt > max ? r.updatedAt : max),
            rows[0].updatedAt,
          )
          .toISOString()
      : (since ?? "");

  const result = rows.map(({ updatedAt: _updatedAt, ...rest }) => rest);

  return NextResponse.json({ ingredients: result, serverMaxUpdatedAt });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, en, ua, category } = body as {
    id?: string;
    en?: string;
    ua?: string | null;
    category?: string;
  };
  if (!id || !en)
    return NextResponse.json({ error: "id and en required" }, { status: 400 });

  await db
    .insert(ingredients)
    .values({
      id,
      en,
      ua: ua ?? null,
      category: category ?? "other",
      aliasesEn: [],
      aliasesUa: [],
      status: "provisional",
    })
    .onConflictDoNothing();

  return NextResponse.json({ id });
}
