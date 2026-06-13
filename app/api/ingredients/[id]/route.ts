import { and, eq, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ingredients } from "@/db/schema/ingredients";
import { ApiError } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/require-session";

const EMBEDDING_DIM = 384;

// Write-once contribution of an on-device embedding for a vocabulary entry.
// The first signed-in device to enrich an ingredient computes its `passage:`
// embedding and PATCHes it here; later writes are ignored because the update
// is guarded on the column still being null. Matching stays client-side — the
// DB only carries the vector to other devices via the GET delta sync.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await requireSession();
  if (authed.response) return authed.response;

  const { id } = await params;

  let body: { embedding?: unknown };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { embedding } = body;
  if (
    !Array.isArray(embedding) ||
    embedding.length !== EMBEDDING_DIM ||
    !embedding.every((value) => typeof value === "number")
  ) {
    return ApiError.badRequest(
      `embedding must be an array of ${EMBEDDING_DIM} numbers`,
    );
  }

  try {
    await db
      .update(ingredients)
      .set({ embedding })
      .where(and(eq(ingredients.id, id), isNull(ingredients.embedding)));

    return NextResponse.json({ success: true });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
