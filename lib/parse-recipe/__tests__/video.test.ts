import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai", () => ({
  callAiForRecipe: vi.fn(),
}));

vi.mock("@/lib/scrapers/apify", () => ({
  fetchSocialContent: vi.fn(),
}));

vi.mock("@/lib/transcribe/groq", () => ({
  GROQ_MAX_BYTES: 24 * 1024 * 1024,
  transcribeWithGroq: vi.fn(),
}));

import { callAiForRecipe } from "@/lib/ai";
import type { ParsedRecipe } from "@/lib/db/schema";
import { fetchSocialContent } from "@/lib/scrapers/apify";
import { captureError, log, trackEvent } from "@/lib/telemetry";
import { transcribeWithGroq } from "@/lib/transcribe/groq";
import { parseVideoRecipe } from "../video";

const parsedRecipe: ParsedRecipe = {
  title: "Tomato Toast",
  servings: 2,
  ingredients: [{ item: "tomatoes" }],
  instructions: [{ order: 1, instruction: "Toast bread." }],
  sourceUrl: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.mocked(transcribeWithGroq).mockReset();
  vi.mocked(callAiForRecipe).mockResolvedValue(parsedRecipe);
});

describe("parseVideoRecipe", () => {
  it("parses static social posts from caption and image context without transcription", async () => {
    const url = "https://www.instagram.com/p/abc123/";
    vi.mocked(fetchSocialContent).mockResolvedValue({
      platform: "instagram",
      url,
      caption: "Tomato toast: bread, tomatoes, olive oil.",
      imageUrls: ["https://cdn/post.jpg"],
      thumbnailUrl: "https://cdn/post.jpg",
    });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await parseVideoRecipe(url);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(transcribeWithGroq).not.toHaveBeenCalled();
    expect(callAiForRecipe).toHaveBeenCalledWith(
      expect.stringContaining("<caption>"),
    );
    expect(callAiForRecipe).toHaveBeenCalledWith(
      expect.stringContaining("https://cdn/post.jpg"),
    );
    expect(result).toMatchObject({
      ...parsedRecipe,
      imageUrl: "https://cdn/post.jpg",
      sourceUrl: url,
    });
  });

  it("uses provided YouTube transcript without downloading media", async () => {
    const url = "https://www.youtube.com/shorts/dQw4w9WgXcQ";
    vi.mocked(fetchSocialContent).mockResolvedValue({
      platform: "youtube",
      url,
      caption: "Lemon pasta",
      transcript: "Boil pasta and mix with lemon butter sauce.",
      durationSeconds: 600,
      imageUrls: ["https://cdn/youtube.jpg"],
      thumbnailUrl: "https://cdn/youtube.jpg",
    });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await parseVideoRecipe(url);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(transcribeWithGroq).not.toHaveBeenCalled();
    expect(callAiForRecipe).toHaveBeenCalledWith(
      expect.stringContaining("<transcript>"),
    );
  });

  it("rejects social videos longer than 30 minutes before transcription or AI", async () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    vi.mocked(fetchSocialContent).mockResolvedValue({
      platform: "youtube",
      url,
      caption: "Ten hour soup",
      transcript: "This transcript should not be used.",
      durationSeconds: 1801,
      imageUrls: ["https://cdn/youtube.jpg"],
    });

    await expect(parseVideoRecipe(url)).rejects.toThrow(
      "Social videos must be 30 minutes or shorter",
    );

    expect(callAiForRecipe).not.toHaveBeenCalled();
    expect(transcribeWithGroq).not.toHaveBeenCalled();
  });

  it("downloads and transcribes video media when no transcript is provided", async () => {
    const url = "https://www.tiktok.com/@cook/video/123";
    const videoBuffer = new ArrayBuffer(8);
    vi.mocked(fetchSocialContent).mockResolvedValue({
      platform: "tiktok",
      url,
      caption: "Crispy potato recipe",
      videoUrl: "https://cdn/video.mp4",
      imageUrls: ["https://cdn/thumb.jpg"],
      thumbnailUrl: "https://cdn/thumb.jpg",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        arrayBuffer: () => Promise.resolve(videoBuffer),
      }),
    );
    vi.mocked(transcribeWithGroq).mockResolvedValue(
      "Slice potatoes, season them, and bake until crisp.",
    );

    await parseVideoRecipe(url);

    expect(fetch).toHaveBeenCalledWith("https://cdn/video.mp4");
    expect(transcribeWithGroq).toHaveBeenCalledWith(videoBuffer, false);
  });

  it("rejects oversized downloadable media before reading the response body", async () => {
    const url = "https://www.tiktok.com/@cook/video/123";
    const arrayBuffer = vi.fn();
    vi.mocked(fetchSocialContent).mockResolvedValue({
      platform: "tiktok",
      url,
      caption: "Crispy potato recipe",
      videoUrl: "https://cdn/video.mp4",
      imageUrls: ["https://cdn/thumb.jpg"],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({
          "content-length": String(24 * 1024 * 1024 + 1),
        }),
        arrayBuffer,
      }),
    );

    await expect(parseVideoRecipe(url)).rejects.toThrow(
      "Video file too large for transcription",
    );

    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(transcribeWithGroq).not.toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith("social_parse_failed", {
      platform: "tiktok",
      reason: "media_too_large",
    });
    expect(captureError).not.toHaveBeenCalled();
  });

  it("tracks and logs successful social parses", async () => {
    const url = "https://www.tiktok.com/@cook/video/123";
    vi.mocked(fetchSocialContent).mockResolvedValue({
      platform: "tiktok",
      url,
      caption: "Crispy potato recipe",
      transcript: "Slice potatoes, season them, and bake until crisp.",
      durationSeconds: 42,
      imageUrls: ["https://cdn/thumb.jpg"],
    });

    await parseVideoRecipe(url);

    expect(trackEvent).toHaveBeenCalledWith("social_parse_started", {
      platform: "tiktok",
    });
    expect(trackEvent).toHaveBeenCalledWith("social_parse_succeeded", {
      platform: "tiktok",
      path: "actor_transcript",
      duration_seconds: 42,
    });
    expect(log).toHaveBeenCalledWith(
      "info",
      "social_parse_pipeline",
      expect.objectContaining({
        platform: "tiktok",
        path: "actor_transcript",
        duration_seconds: 42,
        success: true,
      }),
    );
  });

  it("tracks and logs expected social parse failures without sending them to Sentry", async () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    vi.mocked(fetchSocialContent).mockResolvedValue({
      platform: "youtube",
      url,
      caption: "Ten hour soup",
      durationSeconds: 3600,
      imageUrls: [],
    });

    await expect(parseVideoRecipe(url)).rejects.toThrow(
      "Social videos must be 30 minutes or shorter",
    );

    expect(trackEvent).toHaveBeenCalledWith("social_parse_failed", {
      platform: "youtube",
      reason: "duration_limit",
    });
    expect(log).toHaveBeenCalledWith(
      "warn",
      "social_parse_failed",
      expect.objectContaining({
        platform: "youtube",
        reason: "duration_limit",
        duration_seconds: 3600,
      }),
    );
    expect(captureError).not.toHaveBeenCalled();
  });

  it("captures unexpected social parse failures in Sentry with context", async () => {
    const url = "https://www.tiktok.com/@cook/video/123";
    vi.mocked(fetchSocialContent).mockResolvedValue({
      platform: "tiktok",
      url,
      caption: "Crispy potato recipe",
      videoUrl: "https://cdn/video.mp4",
      imageUrls: ["https://cdn/thumb.jpg"],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
      }),
    );

    await expect(parseVideoRecipe(url)).rejects.toThrow("Video fetch failed");

    expect(captureError).toHaveBeenCalledWith(expect.any(Error), {
      tags: {
        parser: "social",
        platform: "tiktok",
      },
      extra: expect.objectContaining({
        url,
        reason: "unexpected",
      }),
    });
  });

  it("throws when social content has no caption, transcript, images, or video media", async () => {
    const url = "https://x.com/cook/status/123";
    vi.mocked(fetchSocialContent).mockResolvedValue({
      platform: "x",
      url,
      imageUrls: [],
    });

    await expect(parseVideoRecipe(url)).rejects.toThrow(
      "No caption, transcript, images, or video available",
    );
  });

  it("classifies an AI not-recipe response as no_content and does not send to Sentry", async () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    vi.mocked(fetchSocialContent).mockResolvedValue({
      platform: "youtube",
      url,
      caption: "Watch me cook!",
      transcript: "Hey guys welcome back to my channel.",
      durationSeconds: 600,
      imageUrls: ["https://cdn/thumb.jpg"],
    });
    vi.mocked(callAiForRecipe).mockResolvedValue({ notRecipe: true } as never);

    await expect(parseVideoRecipe(url)).rejects.toThrow(
      "Couldn't extract a recipe from this social post",
    );

    expect(trackEvent).toHaveBeenCalledWith("social_parse_failed", {
      platform: "youtube",
      reason: "no_content",
    });
    expect(captureError).not.toHaveBeenCalled();
  });

  it("uses the injected aiCaller instead of callAiForRecipe when one is passed", async () => {
    const url = "https://www.instagram.com/p/abc123/";
    vi.mocked(fetchSocialContent).mockResolvedValue({
      platform: "instagram",
      url,
      caption: "Tomato toast: bread, tomatoes, olive oil.",
      imageUrls: ["https://cdn/post.jpg"],
      thumbnailUrl: "https://cdn/post.jpg",
    });
    const customCaller = vi.fn().mockResolvedValue(parsedRecipe);

    await parseVideoRecipe(url, customCaller);

    expect(customCaller).toHaveBeenCalledWith(
      expect.stringContaining("<caption>"),
    );
    expect(callAiForRecipe).not.toHaveBeenCalled();
  });
});
