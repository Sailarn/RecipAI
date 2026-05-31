import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recipes } from "@/db/schema/recipes";
import { ApiError } from "@/lib/api-errors";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

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
        ...updates,
        updatedAt: updates.updatedAt
          ? new Date(updates.updatedAt as string)
          : new Date(),
      })
      .where(and(eq(recipes.id, id), eq(recipes.userId, session.user.id)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  const { id } = await params;

  try {
    await db
      .delete(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.userId, session.user.id)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
