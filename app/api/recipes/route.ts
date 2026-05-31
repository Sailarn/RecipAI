import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipes } from "@/db/schema/recipes";
import { ApiError } from "@/lib/api-errors";
import { auth } from "@/lib/auth";
import type { Recipe } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  let recipe: Recipe;
  try {
    recipe = (await req.json()) as Recipe;
  } catch {
    return ApiError.invalidBody();
  }

  try {
    await db
      .insert(recipes)
      .values({
        ...recipe,
        userId: session.user.id,
        createdAt: new Date(recipe.createdAt),
        updatedAt: new Date(recipe.updatedAt),
      })
      .onConflictDoNothing();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
