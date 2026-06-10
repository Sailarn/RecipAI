import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { parseJobs } from "@/db/schema/parse-jobs";
import { ApiError } from "@/lib/api-errors";
import { auth } from "@/lib/auth/auth";
import { requireSession } from "@/lib/auth/require-session";
import { PARSE_JOB_STATUS } from "@/lib/db/schema";
import { enforceParseRateLimit } from "@/lib/rate-limit";
import { mintUploadToken } from "@/lib/upload/upload-token";

export async function GET(req: NextRequest) {
  const authed = await requireSession();
  if (authed.response) return authed.response;

  try {
    const jobs = await db
      .select({
        id: parseJobs.id,
        url: parseJobs.url,
        status: parseJobs.status,
        result: parseJobs.result,
        error: parseJobs.error,
        createdAt: parseJobs.createdAt,
      })
      .from(parseJobs)
      .where(eq(parseJobs.userId, authed.session.user.id))
      .orderBy(desc(parseJobs.createdAt))
      .limit(100);

    return NextResponse.json({ jobs });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  const limited = await enforceParseRateLimit(req, session?.user.id);
  if (limited) return limited;

  let body: { url?: string; userComment?: string; pushEndpoint?: string };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { url, userComment, pushEndpoint } = body;
  if (!url) return ApiError.badRequest("URL required");

  const id = crypto.randomUUID();

  try {
    await db.insert(parseJobs).values({
      id,
      userId: session?.user.id || null,
      url,
      userComment: userComment ?? null,
      pushEndpoint: pushEndpoint ?? null,
      status: PARSE_JOB_STATUS.PENDING,
    });

    const uploadToken = await mintUploadToken();
    return NextResponse.json({ jobId: id, uploadToken });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
