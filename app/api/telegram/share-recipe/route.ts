import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { ApiError } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/require-session";
import { getPublicRecipe } from "@/lib/public-recipes/server";
import { buildRecipeInlineResult } from "@/lib/telegram/recipe-inline-result";
import { savePreparedInlineMessage } from "@/lib/telegram-bot";

export async function POST(req: NextRequest) {
  const authed = await requireSession();
  if (authed.response) return authed.response;

  let body: { recipeId?: string };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { recipeId } = body;
  if (!recipeId || typeof recipeId !== "string") {
    return ApiError.badRequest("recipeId is required");
  }

  // Only public recipes are shareable — the card must resolve for recipients.
  const recipe = await getPublicRecipe(recipeId);
  if (!recipe) return ApiError.notFound();

  const [userRow] = await db
    .select({ telegramId: user.telegramId })
    .from(user)
    .where(eq(user.id, authed.session.user.id))
    .limit(1);
  if (!userRow?.telegramId) {
    return ApiError.badRequest("No Telegram account linked");
  }

  try {
    const preparedMessageId = await savePreparedInlineMessage(
      userRow.telegramId,
      buildRecipeInlineResult(recipe),
    );
    if (!preparedMessageId) {
      return ApiError.internal(
        new Error("savePreparedInlineMessage returned no id"),
        req,
      );
    }
    return NextResponse.json({ preparedMessageId });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
