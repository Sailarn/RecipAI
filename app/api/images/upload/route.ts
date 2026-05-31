import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { imagekit } from "@/lib/imagekit";
import { requireUploadAuth } from "@/lib/upload-auth";
import {
  isAllowedImageType,
  MAX_IMAGE_BYTES,
  UPLOAD_ERRORS,
} from "@/lib/upload-limits";

export async function POST(request: Request) {
  const authError = await requireUploadAuth(request);
  if (authError) return authError;

  const contentType = request.headers.get("content-type") ?? "";
  let fileData: string;
  let fileName = `recipe-${Date.now()}`;

  if (contentType.includes("multipart/form-data")) {
    try {
      const form = await request.formData();
      const file = form.get("file") as File | null;
      if (!file) return ApiError.badRequest("No file provided");

      if (!isAllowedImageType(file.type))
        return ApiError.badRequest(UPLOAD_ERRORS.UNSUPPORTED_TYPE);
      if (file.size > MAX_IMAGE_BYTES)
        return ApiError.badRequest(UPLOAD_ERRORS.FILE_TOO_LARGE);

      const buffer = await file.arrayBuffer();
      fileData = Buffer.from(buffer).toString("base64");
      fileName = file.name || fileName;
    } catch {
      return ApiError.invalidBody();
    }
  } else {
    let body: { url?: string; file?: string; fileName?: string };
    try {
      body = await request.json();
    } catch {
      return ApiError.invalidBody();
    }

    const { url, file, fileName: bodyFileName } = body;
    fileName = bodyFileName || fileName;

    if (url) {
      const response = await fetch(url);
      if (!response.ok)
        return ApiError.badRequest("Failed to fetch image from URL");

      const fetchedContentType = response.headers.get("content-type") ?? "";
      if (!isAllowedImageType(fetchedContentType))
        return ApiError.badRequest(UPLOAD_ERRORS.UNSUPPORTED_TYPE);

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_IMAGE_BYTES)
        return ApiError.badRequest(UPLOAD_ERRORS.FILE_TOO_LARGE);

      fileData = Buffer.from(buffer).toString("base64");
    } else if (file) {
      if (Buffer.byteLength(file, "base64") > MAX_IMAGE_BYTES)
        return ApiError.badRequest(UPLOAD_ERRORS.FILE_TOO_LARGE);
      fileData = file;
    } else {
      return ApiError.badRequest("No image source provided");
    }
  }

  try {
    const result = await imagekit.upload({
      file: fileData,
      fileName,
      folder: "/recipes",
    });
    return NextResponse.json({ url: result.url, fileId: result.fileId });
  } catch (error) {
    return ApiError.internal(error, request);
  }
}
