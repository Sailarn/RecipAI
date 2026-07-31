import type { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { imageFetchHeaders } from "@/lib/upload/image-fetch-headers";
import { SOURCE_FETCH_FAILED } from "@/lib/upload/source-image-failure";
import {
  isAllowedImageType,
  MAX_IMAGE_BYTES,
  UPLOAD_ERRORS,
} from "@/lib/upload/upload-limits";

export type ImageSource = { fileData: string; fileName: string };

export type ResolveResult =
  | { ok: true; source: ImageSource }
  | { ok: false; response: NextResponse };

function fallbackFileName(): string {
  return `recipe-${Date.now()}`;
}

function validateImageBytes(
  byteLength: number,
  mimeType: string,
): NextResponse | null {
  if (!isAllowedImageType(mimeType))
    return ApiError.badRequest(UPLOAD_ERRORS.UNSUPPORTED_TYPE);
  if (byteLength > MAX_IMAGE_BYTES)
    return ApiError.badRequest(UPLOAD_ERRORS.FILE_TOO_LARGE);
  return null;
}

async function resolveMultipart(request: Request): Promise<ResolveResult> {
  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    if (!file)
      return { ok: false, response: ApiError.badRequest("No file provided") };

    const validationError = validateImageBytes(file.size, file.type);
    if (validationError) return { ok: false, response: validationError };

    const buffer = await file.arrayBuffer();
    return {
      ok: true,
      source: {
        fileData: Buffer.from(buffer).toString("base64"),
        fileName: file.name || fallbackFileName(),
      },
    };
  } catch {
    return { ok: false, response: ApiError.invalidBody() };
  }
}

async function resolveFromUrl(
  url: string,
  fileName: string,
): Promise<ResolveResult> {
  const response = await fetch(url, { headers: imageFetchHeaders(url) });
  if (!response.ok)
    return {
      ok: false,
      response: ApiError.badRequest(SOURCE_FETCH_FAILED),
    };

  const mimeType = response.headers.get("content-type") ?? "";
  if (!isAllowedImageType(mimeType))
    return {
      ok: false,
      response: ApiError.badRequest(UPLOAD_ERRORS.UNSUPPORTED_TYPE),
    };

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_IMAGE_BYTES)
    return {
      ok: false,
      response: ApiError.badRequest(UPLOAD_ERRORS.FILE_TOO_LARGE),
    };

  return {
    ok: true,
    source: { fileData: Buffer.from(buffer).toString("base64"), fileName },
  };
}

function resolveFromBase64(file: string, fileName: string): ResolveResult {
  if (Buffer.byteLength(file, "base64") > MAX_IMAGE_BYTES)
    return {
      ok: false,
      response: ApiError.badRequest(UPLOAD_ERRORS.FILE_TOO_LARGE),
    };

  return { ok: true, source: { fileData: file, fileName } };
}

async function resolveJson(request: Request): Promise<ResolveResult> {
  let body: { url?: string; file?: string; fileName?: string };
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: ApiError.invalidBody() };
  }

  const fileName = body.fileName || fallbackFileName();

  if (body.url) return resolveFromUrl(body.url, fileName);
  if (body.file) return resolveFromBase64(body.file, fileName);
  return {
    ok: false,
    response: ApiError.badRequest("No image source provided"),
  };
}

/**
 * Reads the request body and turns whichever supported image source it carries
 * (multipart upload, remote URL, or base64 payload) into a single
 * `{ fileData, fileName }` shape, or an error response if validation fails.
 */
export function resolveImageSource(request: Request): Promise<ResolveResult> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data"))
    return resolveMultipart(request);
  return resolveJson(request);
}
