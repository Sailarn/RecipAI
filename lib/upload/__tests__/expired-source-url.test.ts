import { describe, expect, it } from "vitest";
import { isExpiredSourceUrl } from "../expired-source-url";

// 0x6A7FCA5F = 1786759775 s = 2026-08-15
const INSTAGRAM =
  "https://instagram.fmpl1-1.fna.fbcdn.net/v/t51/703_n.jpg?stp=dst-jpg&oe=6A7FCA5F&_nc_sid=c6f216";
const BEFORE_EXPIRY = Date.UTC(2026, 7, 1);
const AFTER_EXPIRY = Date.UTC(2026, 9, 25);

describe("isExpiredSourceUrl", () => {
  describe("Instagram / Facebook CDN", () => {
    it("is expired once the hex `oe` timestamp has passed", () => {
      expect(isExpiredSourceUrl(INSTAGRAM, AFTER_EXPIRY)).toBe(true);
    });

    it("is still valid before it", () => {
      expect(isExpiredSourceUrl(INSTAGRAM, BEFORE_EXPIRY)).toBe(false);
    });

    it("covers the cdninstagram.com hosts too", () => {
      const url =
        "https://scontent-fra5-1.cdninstagram.com/v/x.jpg?oe=6A7FCA5F";

      expect(isExpiredSourceUrl(url, AFTER_EXPIRY)).toBe(true);
    });
  });

  describe("TikTok CDN", () => {
    it("reads the decimal `x-expires` timestamp", () => {
      const url = `https://p19-common-sign.tiktokcdn-us.com/obj/x.jpeg?x-expires=${1786759775}`;

      expect(isExpiredSourceUrl(url, AFTER_EXPIRY)).toBe(true);
      expect(isExpiredSourceUrl(url, BEFORE_EXPIRY)).toBe(false);
    });
  });

  describe("everything else", () => {
    it("never treats an ImageKit or unsigned URL as expired", () => {
      expect(
        isExpiredSourceUrl(
          "https://ik.imagekit.io/RecipAI/recipes/a.jpg",
          AFTER_EXPIRY,
        ),
      ).toBe(false);
      expect(
        isExpiredSourceUrl("https://example.com/a.jpg?oe=1", AFTER_EXPIRY),
      ).toBe(false);
    });

    it("ignores unparseable input", () => {
      expect(isExpiredSourceUrl("not a url", AFTER_EXPIRY)).toBe(false);
    });
  });
});
