import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { collections } from "@/db/schema/collections";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userCollections = await db
    .select()
    .from(collections)
    .where(eq(collections.userId, session.user.id));

  return NextResponse.json({ collections: userCollections });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, emoji = "⭐", id: clientId } = await req.json();
  if (!name)
    return NextResponse.json({ error: "name required" }, { status: 400 });

  const now = new Date();
  const collection = {
    id: clientId ?? crypto.randomUUID(),
    userId: session.user.id,
    name,
    emoji,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(collections).values(collection);
  return NextResponse.json({ collection });
}
