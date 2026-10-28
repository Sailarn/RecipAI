import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { parseJobs } from "@/db/schema/parse-jobs";
import { ApiError } from "@/lib/api-errors";
import { PARSE_JOB_STATUS } from "@/lib/db/schema";
import {
  failStaleParseJobs,
  isStaleParseJob,
  STALE_JOB_ERROR,
} from "@/lib/parse-recipe/stale-parse-jobs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const [job] = await db.select().from(parseJobs).where(eq(parseJobs.id, id));

    if (!job) return ApiError.notFound("Job not found");

    if (isStaleParseJob(job)) {
      await failStaleParseJobs(eq(parseJobs.id, id));
      return NextResponse.json({
        status: PARSE_JOB_STATUS.FAILED,
        result: null,
        error: STALE_JOB_ERROR,
        url: job.url,
      });
    }

    return NextResponse.json({
      status: job.status,
      result: job.result,
      error: job.error,
      url: job.url,
    });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
