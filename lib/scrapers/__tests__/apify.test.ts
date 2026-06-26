import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSocialContent } from "../apify";

const POST_URL = "https://www.instagram.com/p/abc123/";
const TIKTOK_URL = "https://www.tiktok.com/@cook/video/123";
const YOUTUBE_URL = "https://www.youtube.com/shorts/dQw4w9WgXcQ";
const X_URL = "https://x.com/cook/status/123";

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

function fetchRequestBody(mockFetch: ReturnType<typeof vi.fn>) {
  return JSON.parse(String(mockFetch.mock.calls[0][1]?.body));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("APIFY_TOKEN", "test-token");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fetchSocialContent", () => {
  it("throws when APIFY_TOKEN is not configured", async () => {
    vi.stubEnv("APIFY_TOKEN", "");

    await expect(fetchSocialContent(POST_URL)).rejects.toThrow(
      "APIFY_TOKEN not configured",
    );
  });

  it("fails fast on a 401 without retrying", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ error: "bad token" }, { ok: false, status: 401 }),
      );
    vi.stubGlobal("fetch", mockFetch);

    await expect(fetchSocialContent(POST_URL)).rejects.toThrow(
      "Apify error: 401",
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
  it("returns Instagram static post caption and images without requiring video", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          displayUrl: "https://cdn/post.jpg",
          caption: "Tomato toast\n\n#breakfast",
        },
      ]),
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchSocialContent(POST_URL);

    expect(String(mockFetch.mock.calls[0][0])).toContain(
      "apify~instagram-reel-scraper",
    );
    expect(fetchRequestBody(mockFetch)).toEqual({
      username: [POST_URL],
      resultsLimit: 1,
    });
    expect(result).toEqual({
      platform: "instagram",
      url: POST_URL,
      caption: "Tomato toast",
      imageUrls: ["https://cdn/post.jpg"],
      thumbnailUrl: "https://cdn/post.jpg",
    });
  });

  it("maps TikTok video metadata from Apify", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          text: "Crispy potatoes recipe",
          videoUrl: "https://apify.com/kv-store/records/VIDEO_123",
          originCover: "https://cdn/tiktok.jpg",
          duration: 120,
        },
      ]),
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchSocialContent(TIKTOK_URL);

    expect(String(mockFetch.mock.calls[0][0])).toContain(
      "clockworks~tiktok-scraper",
    );
    expect(fetchRequestBody(mockFetch)).toEqual({
      postURLs: [TIKTOK_URL],
      resultsPerPage: 1,
      shouldDownloadVideos: true,
    });
    expect(result).toMatchObject({
      platform: "tiktok",
      caption: "Crispy potatoes recipe",
      videoUrl: "https://apify.com/kv-store/records/VIDEO_123",
      thumbnailUrl: "https://cdn/tiktok.jpg",
      imageUrls: ["https://cdn/tiktok.jpg"],
      durationSeconds: 120,
    });
  });

  it("extracts transcript from TikTok ASR subtitle links when available", async () => {
    const subtitleVtt = [
      "WEBVTT",
      "",
      "1",
      "00:00:00.000 --> 00:00:02.000",
      "Slice the chicken into strips.",
      "",
      "2",
      "00:00:02.000 --> 00:00:04.500",
      "Season with salt and pepper.",
    ].join("\n");

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          {
            text: "Chicken recipe",
            videoUrl: "https://apify.com/kv-store/records/VIDEO_789",
            videoMeta: {
              coverUrl: "https://cdn/tiktok-cover.jpg",
              subtitleLinks: [
                {
                  language: "eng-US",
                  downloadLink: "https://cdn.tiktok.com/subtitles/abc.vtt",
                  source: "ASR",
                },
              ],
            },
          },
        ]),
      )
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(subtitleVtt),
      } as Response);
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchSocialContent(TIKTOK_URL);

    expect(result.transcript).toBe(
      "Slice the chicken into strips.\nSeason with salt and pepper.",
    );
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(String(mockFetch.mock.calls[1][0])).toContain(
      "cdn.tiktok.com/subtitles",
    );
  });

  it("collects TikTok cover from videoMeta.coverUrl when top-level fields are absent", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          text: "Pasta recipe",
          videoUrl: "https://apify.com/kv-store/records/VIDEO_456",
          videoMeta: { coverUrl: "https://cdn/tiktok-cover.jpg", duration: 45 },
        },
      ]),
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchSocialContent(TIKTOK_URL);

    expect(result).toMatchObject({
      thumbnailUrl: "https://cdn/tiktok-cover.jpg",
      imageUrls: ["https://cdn/tiktok-cover.jpg"],
    });
  });

  it("maps YouTube transcripts and thumbnails without downloading video", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          title: "Lemon pasta",
          text: "Full recipe in description",
          subtitles: [{ text: "Boil pasta. Mix lemon sauce." }],
          thumbnails: [{ url: "https://cdn/youtube.jpg" }],
          duration: "00:12:34",
        },
      ]),
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchSocialContent(YOUTUBE_URL);

    expect(String(mockFetch.mock.calls[0][0])).toContain(
      "streamers~youtube-scraper",
    );
    expect(fetchRequestBody(mockFetch)).toEqual({
      startUrls: [{ url: YOUTUBE_URL }],
      maxResults: 1,
      maxResultsShorts: 1,
      maxResultsVideos: 1,
    });
    expect(result).toMatchObject({
      platform: "youtube",
      caption: "Lemon pasta\n\nFull recipe in description",
      transcript: "Boil pasta. Mix lemon sauce.",
      thumbnailUrl: "https://cdn/youtube.jpg",
      imageUrls: ["https://cdn/youtube.jpg"],
      durationSeconds: 754,
    });
  });

  it("maps long-form duration fields from actor output", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          title: "Long soup",
          lengthSeconds: "1860",
        },
      ]),
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchSocialContent(YOUTUBE_URL);

    expect(result.durationSeconds).toBe(1860);
  });

  it("treats noResults items as not-found rather than no-content", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse([{ noResults: true }]));
    vi.stubGlobal("fetch", mockFetch);

    await expect(fetchSocialContent(X_URL)).rejects.toThrow(
      "could not be found",
    );
  });

  it("normalizes known actor unavailable errors", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse([{ error: "video_unavailable" }]));
    vi.stubGlobal("fetch", mockFetch);

    await expect(fetchSocialContent(YOUTUBE_URL)).rejects.toThrow(
      "This social post could not be found",
    );
  });

  it("normalizes known actor private/restricted errors", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(jsonResponse([{ error: "login_required" }]));
    vi.stubGlobal("fetch", mockFetch);

    await expect(fetchSocialContent(POST_URL)).rejects.toThrow(
      "restricted and cannot be accessed",
    );
  });

  it("maps X video posts from easyapi downloader actor", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          url: X_URL,
          result: {
            url: X_URL,
            source: "x",
            author: "cook",
            title: "Crispy fried rice recipe 🍳",
            thumbnail: "https://pbs.twimg.com/thumb/video.jpg",
            medias: [
              {
                url: "https://video.twimg.com/recipe.mp4",
                duration: 25.133,
                quality: "1280x720k",
                extension: "mp4",
                type: "video",
              },
            ],
            type: "single",
            error: false,
          },
        },
      ]),
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchSocialContent(X_URL);

    expect(String(mockFetch.mock.calls[0][0])).toContain(
      "easyapi~twitter-x-video-downloader",
    );
    expect(fetchRequestBody(mockFetch)).toEqual({ links: [X_URL] });
    expect(result).toMatchObject({
      platform: "x",
      caption: "Crispy fried rice recipe 🍳",
      videoUrl: "https://video.twimg.com/recipe.mp4",
      thumbnailUrl: "https://pbs.twimg.com/thumb/video.jpg",
      imageUrls: ["https://pbs.twimg.com/thumb/video.jpg"],
      durationSeconds: 25,
    });
  });

  it("treats X result.error true as not-found", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          url: X_URL,
          result: { error: true },
        },
      ]),
    );
    vi.stubGlobal("fetch", mockFetch);

    await expect(fetchSocialContent(X_URL)).rejects.toThrow(
      "could not be found",
    );
  });

  it("collects transcript from language-keyed subtitle objects", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          title: "Борщ рецепт",
          subtitles: {
            uk: [
              { text: "Беремо буряк і моркву." },
              { text: "Варимо бульйон." },
            ],
            en: [{ text: "Take beets and carrots." }],
          },
          thumbnails: [{ url: "https://cdn/youtube.jpg" }],
          duration: "09:11",
        },
      ]),
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchSocialContent(YOUTUBE_URL);

    expect(result.transcript).toBe("Беремо буряк і моркву.\nВаримо бульйон.");
  });

  it("strips only trailing hashtag lines from captions, not mid-content hashtags", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          caption:
            "Смачний борщ\n\nІнгредієнти:\n- Буряк 2 шт\n- Морква 1 шт\n\n#борщ #рецепт",
        },
      ]),
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchSocialContent(POST_URL);

    expect(result.caption).toBe(
      "Смачний борщ\n\nІнгредієнти:\n- Буряк 2 шт\n- Морква 1 шт",
    );
  });

  it("preserves captions that start with hashtag lines followed by recipe content", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          caption: "#борщ\nІнгредієнти:\n- Буряк 2 шт",
        },
      ]),
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchSocialContent(POST_URL);

    expect(result.caption).toBe("#борщ\nІнгредієнти:\n- Буряк 2 шт");
  });

  it("rejects unsupported social URLs before calling Apify", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      fetchSocialContent("https://example.com/recipe"),
    ).rejects.toThrow("Unsupported social platform");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
