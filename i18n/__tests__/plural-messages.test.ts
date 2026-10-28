import { describe, expect, it, vi } from "vitest";
import en from "@/locales/en.json";
import uk from "@/locales/uk.json";

// vitest.setup.ts mocks next-intl to return bare keys; plurals need the real
// formatter.
const { createTranslator } =
  await vi.importActual<typeof import("next-intl")>("next-intl");

// Formatted under the app's own locale codes, so a code Intl does not know
// (Ukrainian was once "ua") would show up here as English plural forms.
const translate = {
  en: createTranslator({ locale: "en", messages: en }),
  uk: createTranslator({ locale: "uk", messages: uk }),
};

describe("plural messages", () => {
  it.each([
    ["en", 0, "Add items to Pantry"],
    ["en", 1, "Add 1 item to Pantry"],
    ["en", 3, "Add 3 items to Pantry"],
    ["uk", 0, "Додати до комори"],
    ["uk", 1, "Додати 1 продукт до комори"],
    ["uk", 3, "Додати 3 продукти до комори"],
    ["uk", 5, "Додати 5 продуктів до комори"],
  ] as const)("pantry.addItemsCommit in %s for %i", (locale, count, text) => {
    expect(translate[locale]("pantry.addItemsCommit", { count })).toBe(text);
  });

  it.each([
    ["en", 1, "1 step"],
    ["en", 4, "4 steps"],
    ["uk", 1, "1 крок"],
    ["uk", 3, "3 кроки"],
    ["uk", 7, "7 кроків"],
  ] as const)("parse.savedCard.steps in %s for %i", (locale, count, text) => {
    expect(translate[locale]("parse.savedCard.steps", { count })).toBe(text);
  });

  it.each([
    ["en", 1, "1 step"],
    ["en", 2, "2 steps"],
    ["uk", 1, "1 крок"],
    ["uk", 2, "2 кроки"],
    ["uk", 5, "5 кроків"],
  ] as const)("recipeForm.stepCount in %s for %i", (locale, count, text) => {
    expect(translate[locale]("recipeForm.stepCount", { count })).toBe(text);
  });
});
