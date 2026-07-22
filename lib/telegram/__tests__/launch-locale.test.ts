import { afterEach, describe, expect, it, vi } from "vitest";
import type { TelegramWebApp } from "../webapp";

const getCloudItem = vi.hoisted(() => vi.fn());
vi.mock("../cloud-storage", () => ({
  CLOUD_PREF_KEYS: { theme: "theme", locale: "locale" },
  getCloudItem,
}));

import {
  localeFromTelegramLanguage,
  resolveLaunchLocale,
} from "../launch-locale";

function webApp(languageCode: string | undefined): TelegramWebApp {
  return {
    initDataUnsafe: { user: { id: 1, language_code: languageCode } },
  } as TelegramWebApp;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("localeFromTelegramLanguage", () => {
  it("keeps English", () => {
    expect(localeFromTelegramLanguage("en")).toBe("en");
    expect(localeFromTelegramLanguage("en-US")).toBe("en");
  });

  it("maps Ukrainian (uk) to the app's ua locale", () => {
    expect(localeFromTelegramLanguage("uk")).toBe("ua");
  });

  it("maps Russian to Ukrainian", () => {
    expect(localeFromTelegramLanguage("ru")).toBe("ua");
  });

  it("falls back to English for any other or missing language", () => {
    expect(localeFromTelegramLanguage("de")).toBe("en");
    expect(localeFromTelegramLanguage("pl")).toBe("en");
    expect(localeFromTelegramLanguage(undefined)).toBe("en");
  });
});

describe("resolveLaunchLocale", () => {
  it("uses the stored choice over the Telegram language", async () => {
    getCloudItem.mockResolvedValue("en");

    await expect(resolveLaunchLocale(webApp("ru"))).resolves.toBe("en");
  });

  it("ignores an invalid stored value and seeds from the Telegram language", async () => {
    getCloudItem.mockResolvedValue("zz");

    await expect(resolveLaunchLocale(webApp("uk"))).resolves.toBe("ua");
  });

  it("seeds from the Telegram language when nothing is stored", async () => {
    getCloudItem.mockResolvedValue(null);

    await expect(resolveLaunchLocale(webApp("ru"))).resolves.toBe("ua");
    await expect(resolveLaunchLocale(webApp("de"))).resolves.toBe("en");
  });
});
