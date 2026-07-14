import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOptimizedUrl, isImageKitUrl } from "../imagekit-url";

const ENDPOINT = "https://ik.imagekit.io/demo";

describe("imagekit-url", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("with a configured endpoint", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT", ENDPOINT);
    });

    it("appends the resize/format transform to an ImageKit url", () => {
      expect(getOptimizedUrl(`${ENDPOINT}/cake.jpg`, 300)).toBe(
        `${ENDPOINT}/cake.jpg?tr=w-300,f-webp,q-80`,
      );
    });

    it("leaves a non-ImageKit url unchanged", () => {
      expect(getOptimizedUrl("https://example.com/cake.jpg", 300)).toBe(
        "https://example.com/cake.jpg",
      );
    });

    it("recognises ImageKit urls", () => {
      expect(isImageKitUrl(`${ENDPOINT}/x.jpg`)).toBe(true);
      expect(isImageKitUrl("https://example.com/x.jpg")).toBe(false);
      expect(isImageKitUrl(undefined)).toBe(false);
    });
  });

  describe("without a configured endpoint", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT", "");
    });

    it("never applies a transform (no empty-prefix match)", () => {
      expect(getOptimizedUrl("https://example.com/cake.jpg", 300)).toBe(
        "https://example.com/cake.jpg",
      );
      expect(isImageKitUrl("https://anything.com/x.jpg")).toBe(false);
    });
  });
});
