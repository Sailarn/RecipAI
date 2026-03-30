import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipes } from "@/db/schema/recipes";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recipe = await req.json();

  await db.insert(recipes).values({
    ...recipe,
    userId: session.user.id,
    createdAt: new Date(recipe.createdAt),
    updatedAt: new Date(recipe.updatedAt),
  }).onConflictDoNothing();

  return NextResponse.json({ ok: true });
}
