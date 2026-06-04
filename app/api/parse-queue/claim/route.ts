import { and, inArray, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { parseJobs } from "@/db/schema/parse-jobs";
import { ApiError } from "@/lib/api-errors";
import { MAX_SYNC_BATCH_SIZE } from "@/lib/api-limits";
import { requireSession } from "@/lib/auth/require-session";

// Adopt anonymous parse jobs (userId = null) into the signed-in user's
// account, so their local history syncs to the server on login.
export async function POST(req: NextRequest) {
  const authed = await requireSession();
  if (authed.response) return authed.response;

  let body: { ids?: string[] };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  const ids = body.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return ApiError.badRequest("ids required");
  }
  if (ids.length > MAX_SYNC_BATCH_SIZE) {
    return ApiError.badRequest(
      `too many ids — maximum ${MAX_SYNC_BATCH_SIZE} per claim`,
    );
  }

  try {
    await db
      .update(parseJobs)
      .set({ userId: authed.session.user.id })
      .where(and(inArray(parseJobs.id, ids), isNull(parseJobs.userId)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
