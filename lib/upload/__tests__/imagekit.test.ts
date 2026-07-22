import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const upload = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    url: "https://ik.imagekit.io/RecipAI/recipes/recipe-1.jpg",
    fileId: "file-1",
  }),
);
vi.mock("imagekit", () => ({
  default: class {
    upload = upload;
  },
}));

import { uploadImageServer } from "../imagekit";

function imageResponse(overrides?: Partial<Response>): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "image/jpeg" }),
    arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer),
    ...overrides,
  } as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("uploadImageServer", () => {
  it("fetches the source image with browser-like headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(imageResponse());
    vi.stubGlobal("fetch", fetchMock);

    await uploadImageServer(
      "https://scontent-lax7-1.cdninstagram.com/v/photo.jpg",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://scontent-lax7-1.cdninstagram.com/v/photo.jpg",
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": expect.stringContaining("Mozilla/5.0"),
          Referer: "https://www.instagram.com/",
        }),
      }),
    );
  });

  it("uploads to ImageKit and returns the stable url + fileId", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse()));

    const result = await uploadImageServer("https://example.com/a.jpg");

    expect(upload).toHaveBeenCalledOnce();
    expect(result).toEqual({
      url: "https://ik.imagekit.io/RecipAI/recipes/recipe-1.jpg",
      fileId: "file-1",
    });
  });

  it("throws with the status and host when the source fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(imageResponse({ ok: false, status: 403 })),
    );

    await expect(
      uploadImageServer("https://scontent-lax7-1.cdninstagram.com/v/photo.jpg"),
    ).rejects.toThrow(/403.*cdninstagram\.com/);
    expect(upload).not.toHaveBeenCalled();
  });

  it("throws when the fetched content is not an allowed image type", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        imageResponse({
          headers: new Headers({ "content-type": "text/html" }),
        }),
      ),
    );

    await expect(
      uploadImageServer("https://scontent-lax7-1.cdninstagram.com/v/photo.jpg"),
    ).rejects.toThrow(/text\/html/);
    expect(upload).not.toHaveBeenCalled();
  });
});
