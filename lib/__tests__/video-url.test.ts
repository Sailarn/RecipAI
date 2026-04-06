import { describe, expect, it } from "vitest";
import {
  getYouTubeThumbnail,
  isInstagramUrl,
  isUnsupportedVideoUrl,
  isVideoUrl,
} from "../video-url";

describe("isVideoUrl", () => {
  it.each([
    "https://www.instagram.com/reel/ABC123/",
    "https://www.instagram.com/p/ABC123/",
    "https://www.tiktok.com/@user/video/123",
    "https://www.youtube.com/shorts/abc123",
    "https://www.youtube.com/watch?v=abc123",
    "https://youtu.be/abc123",
  ])("returns true for %s", (url) => {
    expect(isVideoUrl(url)).toBe(true);
  });

  it.each([
    "https://www.allrecipes.com/recipe/pasta",
    "https://example.com/recipe",
    "https://www.youtube.com/channel/UCabc",
    "https://www.youtube.com/playlist?list=abc",
  ])("returns false for %s", (url) => {
    expect(isVideoUrl(url)).toBe(false);
  });
});

describe("getYouTubeThumbnail", () => {
  it("extracts thumbnail from youtube.com/watch", () => {
    const result = getYouTubeThumbnail(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(result).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    );
  });

  it("extracts thumbnail from youtu.be short link", () => {
    const result = getYouTubeThumbnail("https://youtu.be/dQw4w9WgXcQ");
    expect(result).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    );
  });

  it("extracts thumbnail from youtube shorts", () => {
    const result = getYouTubeThumbnail(
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    );
    expect(result).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    );
  });

  it("returns null for non-YouTube URLs", () => {
    expect(
      getYouTubeThumbnail("https://www.instagram.com/reel/ABC/"),
    ).toBeNull();
    expect(getYouTubeThumbnail("https://example.com")).toBeNull();
  });
});

describe("isInstagramUrl", () => {
  it("returns true for instagram reel", () => {
    expect(isInstagramUrl("https://www.instagram.com/reel/ABC123/")).toBe(true);
  });

  it("returns true for instagram post", () => {
    expect(isInstagramUrl("https://www.instagram.com/p/ABC123/")).toBe(true);
  });

  it("returns false for non-instagram URLs", () => {
    expect(isInstagramUrl("https://www.youtube.com/watch?v=abc")).toBe(false);
    expect(isInstagramUrl("https://www.tiktok.com/@user/video/123")).toBe(
      false,
    );
  });
});

describe("isUnsupportedVideoUrl", () => {
  it("returns true for TikTok URLs", () => {
    expect(
      isUnsupportedVideoUrl("https://www.tiktok.com/@user/video/123"),
    ).toBe(true);
  });

  it("returns false for supported platforms", () => {
    expect(isUnsupportedVideoUrl("https://www.instagram.com/reel/ABC/")).toBe(
      false,
    );
    expect(isUnsupportedVideoUrl("https://www.youtube.com/watch?v=abc")).toBe(
      false,
    );
  });
});
