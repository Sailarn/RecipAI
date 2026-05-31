import { and, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { collections } from "@/db/schema/collections";
import { ApiError } from "@/lib/api-errors";
import {
  COLLECTION_ERRORS,
  MAX_COLLECTION_EMOJI_LENGTH,
  MAX_COLLECTION_NAME_LENGTH,
  MAX_SYNC_BATCH_SIZE,
} from "@/lib/api-limits";
import { auth } from "@/lib/auth";

interface IncomingCollection {
  id: string;
  name: string;
  emoji?: string;
  createdAt?: string;
  updatedAt?: string;
}

function isValidIncomingCollection(item: unknown): item is IncomingCollection {
  if (!item || typeof item !== "object") return false;
  const collection = item as Record<string, unknown>;

  const hasValidId = typeof collection.id === "string";

  const hasValidName =
    typeof collection.name === "string" &&
    collection.name.trim().length > 0 &&
    collection.name.length <= MAX_COLLECTION_NAME_LENGTH;

  const hasValidEmoji =
    collection.emoji === undefined ||
    (typeof collection.emoji === "string" &&
      collection.emoji.length <= MAX_COLLECTION_EMOJI_LENGTH);

  return hasValidId && hasValidName && hasValidEmoji;
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  let body: { collections?: unknown };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { collections: incoming } = body;

  if (!Array.isArray(incoming))
    return ApiError.badRequest(COLLECTION_ERRORS.ARRAY_REQUIRED);

  if (incoming.length === 0) return NextResponse.json({ synced: 0 });

  if (incoming.length > MAX_SYNC_BATCH_SIZE)
    return ApiError.badRequest(COLLECTION_ERRORS.TOO_MANY);

  if (!incoming.every(isValidIncomingCollection))
    return ApiError.badRequest(COLLECTION_ERRORS.INVALID_ITEMS);

  try {
    const existingRows = await db
      .select({ id: collections.id })
      .from(collections)
      .where(
        and(
          eq(collections.userId, session.user.id),
          inArray(
            collections.id,
            incoming.map((collection) => collection.id),
          ),
        ),
      );

    const existingIdSet = new Set(
      existingRows.map((existingRow) => existingRow.id),
    );
    const toInsert = incoming.filter(
      (collection) => !existingIdSet.has(collection.id),
    );

    if (toInsert.length === 0) return NextResponse.json({ synced: 0 });

    await db.insert(collections).values(
      toInsert.map((collection) => ({
        id: collection.id,
        userId: session.user.id,
        name: collection.name.trim(),
        emoji: collection.emoji ?? "⭐",
        createdAt: collection.createdAt
          ? new Date(collection.createdAt)
          : new Date(),
        updatedAt: collection.updatedAt
          ? new Date(collection.updatedAt)
          : new Date(),
      })),
    );

    return NextResponse.json({ synced: toInsert.length });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
