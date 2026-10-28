import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { parseJobs } from "@/db/schema/parse-jobs";
import { ApiError } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/require-session";
import {
  ACTIVE_PARSE_JOB_STATUSES,
  failStaleParseJobs,
} from "@/lib/parse-recipe/stale-parse-jobs";

// The signed-in user's unfinished link imports, from any device or the bot, so
// the background watcher can follow jobs this device never saw being started.
// Photo and text jobs (no url) are left out: they complete inline on the device
// that started them, which also saves the recipe.
export async function GET(req: NextRequest) {
  const authed = await requireSession();
  if (authed.response) return authed.response;
  const userId = authed.session.user.id;

  try {
    await failStaleParseJobs(eq(parseJobs.userId, userId));
    const jobs = await db
      .select({ id: parseJobs.id })
      .from(parseJobs)
      .where(
        and(
          eq(parseJobs.userId, userId),
          isNotNull(parseJobs.url),
          inArray(parseJobs.status, ACTIVE_PARSE_JOB_STATUSES),
        ),
      );
    return NextResponse.json({ jobs });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
