import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { parseJobs } from "@/db/schema/parse-jobs";
import { ApiError } from "@/lib/api-errors";
import { auth } from "@/lib/auth/auth";
import { PARSE_JOB_STATUS } from "@/lib/db/schema";
import { mintUploadToken } from "@/lib/upload/upload-token";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  let body: { url?: string; userComment?: string };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { url, userComment } = body;
  if (!url) return ApiError.badRequest("URL required");

  const id = crypto.randomUUID();

  try {
    await db.insert(parseJobs).values({
      id,
      userId: session?.user.id ?? null,
      url,
      userComment: userComment ?? null,
      status: PARSE_JOB_STATUS.PENDING,
    });

    const uploadToken = await mintUploadToken();
    return NextResponse.json({ jobId: id, uploadToken });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
