import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipes } from "@/db/schema/recipes";
import { ApiError } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/require-session";
import type { Recipe } from "@/lib/db/schema";
import { pickRecipeContent } from "../../recipe-write-fields";

type RecipeSnapshot = Omit<Recipe, "createdAt" | "updatedAt"> & {
  createdAt: Date | string;
  updatedAt: Date | string;
};

interface VisibilityBody {
  isPublic?: unknown;
  recipe?: Partial<RecipeSnapshot>;
}

function isValidDate(value: unknown): value is Date | string {
  if (!(value instanceof Date) && typeof value !== "string") return false;
  return !Number.isNaN(new Date(value).getTime());
}

function isCompleteRecipe(
  recipe: Partial<RecipeSnapshot> | undefined,
): recipe is RecipeSnapshot {
  return (
    typeof recipe?.id === "string" &&
    typeof recipe.title === "string" &&
    typeof recipe.servings === "number" &&
    Array.isArray(recipe.ingredients) &&
    Array.isArray(recipe.instructions) &&
    isValidDate(recipe.createdAt) &&
    isValidDate(recipe.updatedAt)
  );
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await requireSession();
  if (authed.response) return authed.response;

  const { id } = await params;
  let body: VisibilityBody;
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }
  if (typeof body.isPublic !== "boolean") return ApiError.invalidBody();
  if (
    body.isPublic &&
    (!isCompleteRecipe(body.recipe) || body.recipe.id !== id)
  )
    return ApiError.invalidBody();

  try {
    return await db.transaction(async (transaction) => {
      const [existing] = await transaction
        .select({ userId: recipes.userId })
        .from(recipes)
        .where(eq(recipes.id, id))
        .limit(1);
      if (existing && existing.userId !== authed.session.user.id)
        return ApiError.notFound();

      if (!body.isPublic) {
        if (existing) {
          await transaction
            .update(recipes)
            .set({ isPublic: false })
            .where(
              and(
                eq(recipes.id, id),
                eq(recipes.userId, authed.session.user.id),
              ),
            )
            .returning({ id: recipes.id });
        }
        return NextResponse.json({ isPublic: false });
      }

      const recipe = body.recipe as RecipeSnapshot;
      const values = {
        ...pickRecipeContent(recipe as Recipe),
        userId: authed.session.user.id,
        isPublic: true,
        updatedAt: new Date(recipe.updatedAt),
      };
      if (existing) {
        await transaction
          .update(recipes)
          .set(values)
          .where(
            and(eq(recipes.id, id), eq(recipes.userId, authed.session.user.id)),
          )
          .returning({ id: recipes.id });
      } else {
        await transaction.insert(recipes).values({
          ...values,
          id,
          createdAt: new Date(recipe.createdAt),
        });
      }
      return NextResponse.json({ isPublic: true });
    });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
