import { describe, expect, it, vi } from "vitest";

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));

vi.mock("next/navigation", () => ({ notFound }));

// The jsdom environment resolves `next-intl/server` to its Client Component
// build, which refuses to run `getRequestConfig` at all. The real one hands
// back the callback it was given, so identity is a faithful stand-in and keeps
// the test on our own resolution logic.
vi.mock("next-intl/server", () => ({
  getRequestConfig: <T>(callback: T) => callback,
}));

import { defaultLocale } from "../config";
import getRequestConfigCallback from "../request";

/**
 * `getRequestConfig` hands back the callback it was given, so the default
 * export can be invoked directly with the argument next-intl would pass.
 */
function resolveConfig(requestLocale: string | undefined) {
  return getRequestConfigCallback({
    requestLocale: Promise.resolve(requestLocale),
    locale: undefined,
  });
}

describe("getRequestConfig", () => {
  describe("inside app/[locale]", () => {
    it("uses the requested locale", async () => {
      const config = await resolveConfig("en");

      expect(config.locale).toBe("en");
      expect(config.messages).toBeDefined();
    });

    it("404s a locale segment that is not a supported locale", async () => {
      await expect(resolveConfig("xx")).rejects.toThrow(
        "NEXT_HTTP_ERROR_FALLBACK;404",
      );

      expect(notFound).toHaveBeenCalled();
    });
  });

  describe("outside app/[locale] (the external-auth tree)", () => {
    it("falls back to the default locale instead of 404ing", async () => {
      const config = await resolveConfig(undefined);

      expect(config.locale).toBe(defaultLocale);
      expect(config.messages).toBeDefined();
    });

    it("does not call notFound when there is no locale segment", async () => {
      notFound.mockClear();

      await resolveConfig(undefined);

      expect(notFound).not.toHaveBeenCalled();
    });
  });
});
