import { describe, expect, it, vi } from "vitest";
import en from "@/locales/en.json";
import ua from "@/locales/ua.json";

// vitest.setup.ts mocks next-intl to return bare keys; plurals need the real
// formatter.
const { createTranslator } =
  await vi.importActual<typeof import("next-intl")>("next-intl");

// Formatted under "uk", the real Ukrainian code: Intl does not know the app's
// "ua" segment and falls back to English plural rules (one/other only), so this
// checks the messages' wording, not what the "ua" route renders today.
const translate = {
  en: createTranslator({ locale: "en", messages: en }),
  ua: createTranslator({ locale: "uk", messages: ua }),
};

describe("plural messages", () => {
  it.each([
    ["en", 0, "Add items to Pantry"],
    ["en", 1, "Add 1 item to Pantry"],
    ["en", 3, "Add 3 items to Pantry"],
    ["ua", 0, "Додати до комори"],
    ["ua", 1, "Додати 1 продукт до комори"],
    ["ua", 3, "Додати 3 продукти до комори"],
    ["ua", 5, "Додати 5 продуктів до комори"],
  ] as const)("pantry.addItemsCommit in %s for %i", (locale, count, text) => {
    expect(translate[locale]("pantry.addItemsCommit", { count })).toBe(text);
  });

  it.each([
    ["en", 1, "1 step"],
    ["en", 4, "4 steps"],
    ["ua", 1, "1 крок"],
    ["ua", 3, "3 кроки"],
    ["ua", 7, "7 кроків"],
  ] as const)("parse.savedCard.steps in %s for %i", (locale, count, text) => {
    expect(translate[locale]("parse.savedCard.steps", { count })).toBe(text);
  });
});
