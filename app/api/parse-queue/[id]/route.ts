import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { parseJobs } from "@/db/schema/parse-jobs";
import { ApiError } from "@/lib/api-errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const [job] = await db.select().from(parseJobs).where(eq(parseJobs.id, id));

    if (!job) return ApiError.notFound("Job not found");

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
