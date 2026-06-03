import { api } from "../routes";

const IMAGEKIT_URL = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "";

export const isImageKitUrl = (url: string) => url.startsWith(IMAGEKIT_URL);

interface ImageRequestOptions {
  uploadToken?: string;
}

function buildAuthHeaders(
  options?: ImageRequestOptions,
): Record<string, string> {
  if (options?.uploadToken) {
    return { "X-Upload-Token": options.uploadToken };
  }
  return {};
}

export async function uploadImage(
  source: string | File,
  options?: ImageRequestOptions,
): Promise<{ url: string; fileId: string }> {
  const authHeaders = buildAuthHeaders(options);
  let response: Response;

  if (source instanceof File) {
    const form = new FormData();
    form.append("file", source);
    // Do not set Content-Type manually for multipart — the browser adds the boundary.
    response = await fetch(api.images.upload, {
      method: "POST",
      headers: authHeaders,
      body: form,
    });
  } else {
    response = await fetch(api.images.upload, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ url: source }),
    });
  }

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Image upload failed");
  }

  return response.json();
}

export async function deleteImage(
  fileId: string,
  options?: ImageRequestOptions,
): Promise<void> {
  const authHeaders = buildAuthHeaders(options);
  await fetch(api.images.delete, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ fileId }),
  });
}
