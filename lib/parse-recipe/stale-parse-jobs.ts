import { and, inArray, lt, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { parseJobs } from "@/db/schema/parse-jobs";
import { PARSE_JOB_STATUS } from "@/lib/db/schema";

// A parse finishes within a couple of minutes (the process route itself is
// capped at 60s on Vercel). A job still pending or processing after this long
// was never kicked off, or its server died mid-parse — nothing will finish it.
const STALE_JOB_MS = 10 * 60_000;

export const STALE_JOB_ERROR = "Parsing timed out — the job never finished.";

export const ACTIVE_PARSE_JOB_STATUSES = [
  PARSE_JOB_STATUS.PENDING,
  PARSE_JOB_STATUS.PROCESSING,
];

interface JobActivity {
  status: string;
  updatedAt: Date;
}

export function isStaleParseJob(job: JobActivity, now = Date.now()): boolean {
  return (
    (job.status === PARSE_JOB_STATUS.PENDING ||
      job.status === PARSE_JOB_STATUS.PROCESSING) &&
    now - job.updatedAt.getTime() >= STALE_JOB_MS
  );
}

/**
 * Marks stuck jobs within `scope` as failed. There is no scheduler: this runs
 * lazily wherever active jobs are read (a status poll, the active-jobs list),
 * so a stuck job is resolved the next time anyone looks at it.
 */
export async function failStaleParseJobs(scope: SQL): Promise<void> {
  await db
    .update(parseJobs)
    .set({
      status: PARSE_JOB_STATUS.FAILED,
      error: STALE_JOB_ERROR,
      updatedAt: new Date(),
    })
    .where(
      and(
        scope,
        inArray(parseJobs.status, ACTIVE_PARSE_JOB_STATUSES),
        lt(parseJobs.updatedAt, new Date(Date.now() - STALE_JOB_MS)),
      ),
    );
}
