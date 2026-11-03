import { describe, expect, it } from "vitest";
import { localeFromAcceptLanguage } from "../accept-language";

describe("localeFromAcceptLanguage", () => {
  it("picks the highest-weighted supported language", () => {
    expect(localeFromAcceptLanguage("uk-UA,uk;q=0.9,en;q=0.8")).toBe("uk");
    expect(localeFromAcceptLanguage("en-US,en;q=0.9,uk;q=0.5")).toBe("en");
    expect(localeFromAcceptLanguage("de;q=0.9,en;q=0.95")).toBe("en");
  });

  it("skips unsupported languages", () => {
    expect(localeFromAcceptLanguage("de-DE,fr;q=0.8,en;q=0.5")).toBe("en");
  });

  it("falls back to the default locale", () => {
    expect(localeFromAcceptLanguage(null)).toBe("uk");
    expect(localeFromAcceptLanguage("")).toBe("uk");
    expect(localeFromAcceptLanguage("de,fr")).toBe("uk");
    expect(localeFromAcceptLanguage("en;q=0")).toBe("uk");
  });
});
