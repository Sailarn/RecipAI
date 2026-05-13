import { and, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { collections } from "@/db/schema/collections";
import { auth } from "@/lib/auth";

interface IncomingCollection {
  id: string;
  name: string;
  emoji?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { collections: incoming } = await req.json();

  if (!Array.isArray(incoming))
    return NextResponse.json(
      { error: "collections array required" },
      { status: 400 },
    );

  if (incoming.length === 0) return NextResponse.json({ synced: 0 });

  const existingRows = await db
    .select({ id: collections.id })
    .from(collections)
    .where(
      and(
        eq(collections.userId, session.user.id),
        inArray(
          collections.id,
          incoming.map((c: IncomingCollection) => c.id),
        ),
      ),
    );

  const existingIdSet = new Set(existingRows.map((r) => r.id));
  const toInsert = incoming.filter(
    (c: IncomingCollection) => !existingIdSet.has(c.id),
  );

  if (toInsert.length === 0) return NextResponse.json({ synced: 0 });

  await db.insert(collections).values(
    toInsert.map((c: IncomingCollection) => ({
      id: c.id,
      userId: session.user.id,
      name: c.name,
      emoji: c.emoji ?? "⭐",
      createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
      updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
    })),
  );

  return NextResponse.json({ synced: toInsert.length });
}
