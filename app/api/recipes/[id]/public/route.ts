import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { getPublicRecipe } from "@/lib/public-recipes/server";

// Anonymous by design — the client-fetchable counterpart to the share page's
// server-side getPublicRecipe() call. A Telegram deep link (or any other
// client-side navigation) that opens a recipe not on this device and not the
// signed-in user's own needs a way to check "is this a recipe someone else
// shared publicly?" without a full page navigation. getPublicRecipe() already
// scopes to isPublic-only, so a private recipe stays unreachable here too.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const recipe = await getPublicRecipe(id);
  if (!recipe) return ApiError.notFound();
  return NextResponse.json({ recipe });
}
