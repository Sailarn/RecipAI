import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchInstagramReel } from "../apify";

const REEL_URL = "https://www.instagram.com/reel/abc123/";

function jsonResponse(
  body: unknown,
  init: { ok?: boolean; status?: number } = {},
) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APIFY_TOKEN", "test-token");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fetchInstagramReel", () => {
  it("throws when APIFY_TOKEN is not configured", async () => {
    vi.stubEnv("APIFY_TOKEN", "");

    await expect(fetchInstagramReel(REEL_URL)).rejects.toThrow(
      "APIFY_TOKEN not configured",
    );
  });

  it("returns the parsed reel on a successful response", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          videoUrl: "https://cdn/video.mp4",
          displayUrl: "https://cdn/thumb.jpg",
          caption: "Tasty pasta #recipe #food",
        },
      ]),
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchInstagramReel(REEL_URL);

    expect(result.videoUrl).toBe("https://cdn/video.mp4");
    expect(result.thumbnailUrl).toBe("https://cdn/thumb.jpg");
    expect(result.caption).toBe("Tasty pasta");
    expect(result.isAudio).toBe(false);
  });

  it("prefers audioUrl and flags isAudio when present", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          videoUrl: "https://cdn/video.mp4",
          audioUrl: "https://cdn/audio.m4a",
        },
      ]),
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchInstagramReel(REEL_URL);

    expect(result.videoUrl).toBe("https://cdn/audio.m4a");
    expect(result.isAudio).toBe(true);
  });

  it("fails fast on a 401 without retrying", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ error: "bad token" }, { ok: false, status: 401 }),
      );
    vi.stubGlobal("fetch", mockFetch);

    await expect(fetchInstagramReel(REEL_URL)).rejects.toThrow(
      "Apify error: 401",
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("surfaces a friendly message for a restricted reel", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse([{ error: "restricted_page" }]));
    vi.stubGlobal("fetch", mockFetch);

    await expect(fetchInstagramReel(REEL_URL)).rejects.toThrow(
      "This reel is restricted",
    );
  });
});
