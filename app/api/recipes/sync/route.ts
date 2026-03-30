import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipes } from "@/db/schema/recipes";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recipes: localRecipes } = await req.json();

  if (!localRecipes?.length) {
    return NextResponse.json({ synced: 0 });
  }

  const rows = localRecipes.map((r: any) => ({
  ...r,
  userId: session.user.id,
  createdAt: new Date(r.createdAt),
  updatedAt: new Date(r.updatedAt),
}));

  await db.insert(recipes)
  .values(rows)
  .onConflictDoUpdate({
    target: recipes.id,
    set: {
      title: sql`excluded.title`,
      description: sql`excluded.description`,
      imageUrl: sql`excluded.image_url`,
      imageFileId: sql`excluded.image_file_id`,
      prepTime: sql`excluded.prep_time`,
      cookTime: sql`excluded.cook_time`,
      totalTime: sql`excluded.total_time`,
      servings: sql`excluded.servings`,
      ingredients: sql`excluded.ingredients`,
      instructions: sql`excluded.instructions`,
      sourceUrl: sql`excluded.source_url`,
      updatedAt: sql`excluded.updated_at`,
    },
  });

  return NextResponse.json({ synced: rows.length });
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
