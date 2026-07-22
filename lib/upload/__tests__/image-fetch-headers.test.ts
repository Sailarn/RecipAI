import { describe, expect, it } from "vitest";
import { imageFetchHeaders } from "../image-fetch-headers";

describe("imageFetchHeaders", () => {
  it("always sends a browser user agent and an image Accept", () => {
    const headers = imageFetchHeaders("https://example.com/a.jpg");

    expect(headers["User-Agent"]).toContain("Mozilla/5.0");
    expect(headers.Accept).toContain("image/");
  });

  it("adds an instagram referer for cdninstagram hosts", () => {
    const headers = imageFetchHeaders(
      "https://scontent-lax7-1.cdninstagram.com/v/t51.jpg",
    );

    expect(headers.Referer).toBe("https://www.instagram.com/");
  });

  it("adds an instagram referer for fbcdn hosts", () => {
    const headers = imageFetchHeaders("https://scontent.fbcdn.net/v/x.jpg");

    expect(headers.Referer).toBe("https://www.instagram.com/");
  });

  it("omits the referer for non-instagram hosts", () => {
    const headers = imageFetchHeaders("https://ik.imagekit.io/x.jpg");

    expect(headers).not.toHaveProperty("Referer");
  });
});
