import { eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipes } from "@/db/schema/recipes";
import { ApiError } from "@/lib/api-errors";
import { MAX_SYNC_BATCH_SIZE, RECIPE_SYNC_ERRORS } from "@/lib/api-limits";
import { requireSession } from "@/lib/auth/require-session";
import type { Recipe } from "@/lib/db/schema";
import { pickRecipeContent } from "../recipe-write-fields";

export async function POST(req: NextRequest) {
  const authed = await requireSession();
  if (authed.response) return authed.response;

  let body: { recipes?: unknown };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { recipes: localRecipes } = body;

  if (!Array.isArray(localRecipes) || localRecipes.length === 0)
    return NextResponse.json({ synced: 0 });

  if (localRecipes.length > MAX_SYNC_BATCH_SIZE)
    return ApiError.badRequest(RECIPE_SYNC_ERRORS.TOO_MANY);

  try {
    const ids = localRecipes.map((recipe: Recipe) => recipe.id);
    const existingRows = await db
      .select({ id: recipes.id })
      .from(recipes)
      .where(inArray(recipes.id, ids));

    const existingIdSet = new Set(
      existingRows.map((existingRow) => existingRow.id),
    );
    const newRecipes = localRecipes.filter(
      (recipe: Recipe) => !existingIdSet.has(recipe.id),
    );

    if (newRecipes.length > 0) {
      await db
        .insert(recipes)
        .values(
          newRecipes.map((recipe: Recipe) => ({
            ...pickRecipeContent(recipe),
            id: recipe.id,
            userId: authed.session.user.id,
            isPublic: false,
            createdAt: new Date(recipe.createdAt),
            updatedAt: new Date(recipe.updatedAt),
          })),
        )
        .onConflictDoNothing();
    }

    return NextResponse.json({ synced: newRecipes.length });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}

export async function GET(req: NextRequest) {
  const authed = await requireSession();
  if (authed.response) return authed.response;

  try {
    const userRecipes = await db
      .select()
      .from(recipes)
      .where(eq(recipes.userId, authed.session.user.id));

    return NextResponse.json({ recipes: userRecipes });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
