import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { collections } from "@/db/schema/collections";
import { ApiError } from "@/lib/api-errors";
import {
  COLLECTION_ERRORS,
  MAX_COLLECTION_EMOJI_LENGTH,
  MAX_COLLECTION_NAME_LENGTH,
} from "@/lib/api-limits";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  try {
    const userCollections = await db
      .select()
      .from(collections)
      .where(eq(collections.userId, session.user.id));

    return NextResponse.json({ collections: userCollections });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  let body: { name?: string; emoji?: string; id?: string };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { name, emoji = "⭐", id: clientId } = body;
  if (!name?.trim())
    return ApiError.badRequest(COLLECTION_ERRORS.NAME_REQUIRED);
  if (name.length > MAX_COLLECTION_NAME_LENGTH)
    return ApiError.badRequest(COLLECTION_ERRORS.NAME_TOO_LONG);
  if (emoji.length > MAX_COLLECTION_EMOJI_LENGTH)
    return ApiError.badRequest(COLLECTION_ERRORS.EMOJI_TOO_LONG);

  const now = new Date();
  const collection = {
    id: clientId ?? crypto.randomUUID(),
    userId: session.user.id,
    name: name.trim(),
    emoji,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.insert(collections).values(collection);
    return NextResponse.json({ collection });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
