import { eq, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipes } from "@/db/schema/recipes";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recipes: localRecipes } = await req.json();
  if (!localRecipes?.length) return NextResponse.json({ synced: 0 });

  const ids = localRecipes.map((r: any) => r.id);
  const existing = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(inArray(recipes.id, ids));

  const existingIds = new Set(existing.map((r) => r.id));
  const newRecipes = localRecipes.filter((r: any) => !existingIds.has(r.id));

  if (newRecipes.length > 0) {
    const rows = newRecipes.map((r: any) => ({
      ...r,
      userId: session.user.id,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }));
    await db.insert(recipes).values(rows).onConflictDoNothing();
  }

  return NextResponse.json({ synced: newRecipes.length });
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userRecipes = await db
    .select()
    .from(recipes)
    .where(eq(recipes.userId, session.user.id));

  return NextResponse.json({ recipes: userRecipes });
}
