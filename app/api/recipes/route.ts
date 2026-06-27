import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipes } from "@/db/schema/recipes";
import { ApiError } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/require-session";
import type { Recipe } from "@/lib/db/schema";
import { pickRecipeContent } from "./recipe-write-fields";

export async function POST(req: NextRequest) {
  const authed = await requireSession();
  if (authed.response) return authed.response;

  let recipe: Recipe;
  try {
    recipe = (await req.json()) as Recipe;
  } catch {
    return ApiError.invalidBody();
  }

  try {
    const inserted = await db
      .insert(recipes)
      .values({
        ...pickRecipeContent(recipe),
        id: recipe.id,
        userId: authed.session.user.id,
        isPublic: false,
        createdAt: new Date(recipe.createdAt),
        updatedAt: new Date(recipe.updatedAt),
      })
      .onConflictDoNothing()
      .returning({ id: recipes.id });

    return NextResponse.json({ created: inserted.length > 0 });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
