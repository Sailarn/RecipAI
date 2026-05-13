import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { collections } from "@/db/schema/collections";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, emoji } = await req.json();

  if (!name)
    return NextResponse.json({ error: "name required" }, { status: 400 });

  await db
    .update(collections)
    .set({ name, emoji, updatedAt: new Date() })
    .where(
      and(eq(collections.id, id), eq(collections.userId, session.user.id)),
    );

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await db
    .delete(collections)
    .where(
      and(eq(collections.id, id), eq(collections.userId, session.user.id)),
    );

  return NextResponse.json({ ok: true });
}
