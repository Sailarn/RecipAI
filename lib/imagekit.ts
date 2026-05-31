import ImageKit from "imagekit";
import {
  isAllowedImageType,
  MAX_IMAGE_BYTES,
  UPLOAD_ERRORS,
} from "@/lib/upload-limits";

export const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY ?? "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY ?? "",
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "",
});

export async function uploadImageServer(
  url: string,
): Promise<{ url: string; fileId: string }> {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Failed to fetch image: ${response.status}`);

  const fetchedContentType = response.headers.get("content-type") ?? "";
  if (!isAllowedImageType(fetchedContentType))
    throw new Error(UPLOAD_ERRORS.UNSUPPORTED_TYPE);

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_IMAGE_BYTES)
    throw new Error(UPLOAD_ERRORS.FILE_TOO_LARGE);

  const base64 = Buffer.from(buffer).toString("base64");
  const result = await imagekit.upload({
    file: base64,
    fileName: `recipe-${Date.now()}`,
    folder: "/recipes",
  });
  return { url: result.url, fileId: result.fileId };
}
