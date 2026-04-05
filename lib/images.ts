import { api } from "./routes";

const IMAGEKIT_URL = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "";

export const isImageKitUrl = (url: string) => url.startsWith(IMAGEKIT_URL);

export async function uploadImage(
  source: string | File,
): Promise<{ url: string; fileId: string }> {
  let response: Response;

  if (source instanceof File) {
    const form = new FormData();
    form.append("file", source);
    response = await fetch(api.images.upload, {
      method: "POST",
      body: form,
    });
  } else {
    response = await fetch(api.images.upload, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: source }),
    });
  }

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Image upload failed");
  }

  return response.json();
}

export async function deleteImage(fileId: string): Promise<void> {
  await fetch(api.images.delete, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId }),
  });
}
