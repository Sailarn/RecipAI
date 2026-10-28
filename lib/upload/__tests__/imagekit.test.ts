import { afterEach, describe, expect, it, vi } from "vitest";

const upload = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    url: "https://ik.imagekit.io/RecipAI/recipes/recipe-1.jpg",
    fileId: "file-1",
  }),
);
vi.mock("@imagekit/nodejs", () => ({
  default: class {
    files = { upload };
  },
}));

import { uploadImageServer, uploadToImageKit } from "../imagekit";

function imageResponse(overrides?: Partial<Response>): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "image/jpeg" }),
    arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer),
    ...overrides,
  } as unknown as Response;
}

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

  it("uploads to ImageKit as a parse-cache file and returns the stable url + fileId", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse()));

    const result = await uploadImageServer("https://example.com/a.jpg");

    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ["owner-parse-cache"] }),
    );
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

describe("uploadToImageKit", () => {
  it("uploads into the recipe image folder, tagged with its owner", async () => {
    await uploadToImageKit("AQID", "a.jpg", "owner-user-1");

    expect(upload).toHaveBeenCalledWith({
      file: "AQID",
      fileName: "a.jpg",
      folder: "/recipes",
      tags: ["owner-user-1"],
    });
  });

  it("throws when ImageKit answers without a url or fileId", async () => {
    upload.mockResolvedValueOnce({ fileId: "file-1" });

    await expect(
      uploadToImageKit("AQID", "a.jpg", "owner-user-1"),
    ).rejects.toThrow(/no url or fileId/);
  });
});
