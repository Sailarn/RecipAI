import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { collections } from "@/db/schema/collections";
import { ApiError } from "@/lib/api-errors";
import {
  COLLECTION_ERRORS,
  MAX_COLLECTION_EMOJI_LENGTH,
  MAX_COLLECTION_NAME_LENGTH,
} from "@/lib/api-limits";
import { requireSession } from "@/lib/auth/require-session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await requireSession();
  if (authed.response) return authed.response;

  const { id } = await params;

  let body: { name?: string; emoji?: string };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { name, emoji } = body;
  if (!name?.trim())
    return ApiError.badRequest(COLLECTION_ERRORS.NAME_REQUIRED);
  if (name.length > MAX_COLLECTION_NAME_LENGTH)
    return ApiError.badRequest(COLLECTION_ERRORS.NAME_TOO_LONG);
  if (emoji !== undefined && emoji.length > MAX_COLLECTION_EMOJI_LENGTH)
    return ApiError.badRequest(COLLECTION_ERRORS.EMOJI_TOO_LONG);

  try {
    await db
      .update(collections)
      .set({ name: name.trim(), emoji, updatedAt: new Date() })
      .where(
        and(
          eq(collections.id, id),
          eq(collections.userId, authed.session.user.id),
        ),
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
      .delete(collections)
      .where(
        and(
          eq(collections.id, id),
          eq(collections.userId, authed.session.user.id),
        ),
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
