import { headers } from "next/headers";
import type { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { auth } from "@/lib/auth";
import { verifyUploadToken } from "@/lib/upload-token";

/**
 * Returns null if the request is authorised for image upload/delete operations
 * (a valid session OR a valid upload token is sufficient),
 * or a 401 response if neither is present.
 */
export async function requireUploadAuth(
  request: Request,
): Promise<NextResponse | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) return null;

  const token = request.headers.get("x-upload-token");
  if (!token) return ApiError.unauthorized();

  const isValid = await verifyUploadToken(token);
  return isValid ? null : ApiError.unauthorized();
}
