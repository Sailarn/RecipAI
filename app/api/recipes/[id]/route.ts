import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipes } from "@/db/schema/recipes";
import { ApiError } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/require-session";
import { pickRecipeContent } from "../recipe-write-fields";

// Owner-scoped fetch of a single recipe, any visibility. Lets a device pull its
// own recipe that isn't in local Dexie yet — e.g. opening a Telegram bot deep
// link before the full sync has run. The public share page uses getPublicRecipe
// (isPublic-only) instead, so a private recipe stays reachable only by its owner.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await requireSession();
  if (authed.response) return authed.response;

  const { id } = await params;

  try {
    const [row] = await db
      .select()
      .from(recipes)
      .where(
        and(eq(recipes.id, id), eq(recipes.userId, authed.session.user.id)),
      )
      .limit(1);

    if (!row) return ApiError.notFound();

    return NextResponse.json({ recipe: row });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await requireSession();
  if (authed.response) return authed.response;

  const { id } = await params;

  let updates: Record<string, unknown>;
  try {
    updates = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  try {
    await db
      .update(recipes)
      .set({
        ...pickRecipeContent(updates),
        // Snapshots from the client (e.g. sync-review "keep mine") carry
        // createdAt/updatedAt as ISO strings; Drizzle's timestamp columns call
        // .toISOString() on the value, so a string crashes the write. Revive
        // both to Date — mirroring the recipes-sync upsert. createdAt stays
        // undefined (Drizzle skips it) when the client omits it.
        createdAt: updates.createdAt
          ? new Date(updates.createdAt as string)
          : undefined,
        updatedAt: updates.updatedAt
          ? new Date(updates.updatedAt as string)
          : new Date(),
      })
      .where(
        and(eq(recipes.id, id), eq(recipes.userId, authed.session.user.id)),
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await requireSession();
  if (authed.response) return authed.response;

  const { id } = await params;

  try {
    await db
      .delete(recipes)
      .where(
        and(eq(recipes.id, id), eq(recipes.userId, authed.session.user.id)),
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
