import { describe, expect, it } from "vitest";
import type { VocabularyIngredient } from "@/lib/db/schema";
import { buildVocabNameIndex, localizeIngredientItem } from "../localize-item";

const FLOUR: VocabularyIngredient = {
  id: "all-purpose-flour",
  en: "all-purpose flour",
  ua: "борошно універсальне",
  category: "grain",
  aliasesEn: ["flour", "plain flour"],
  aliasesUa: ["борошно"],
  status: "confirmed",
};

const SALT: VocabularyIngredient = {
  id: "salt",
  en: "salt",
  ua: "сіль",
  category: "spice",
  aliasesEn: [],
  aliasesUa: [],
  status: "confirmed",
};

const index = buildVocabNameIndex([FLOUR, SALT]);

describe("buildVocabNameIndex", () => {
  it("indexes the english name, ukrainian name, and aliases of both languages", () => {
    expect(index.get("all-purpose flour")).toBe(FLOUR);
    expect(index.get("борошно універсальне")).toBe(FLOUR);
    expect(index.get("flour")).toBe(FLOUR);
    expect(index.get("борошно")).toBe(FLOUR);
  });

  it("matches case-insensitively", () => {
    expect(index.get("flour")).toBe(FLOUR);
    expect(buildVocabNameIndex([FLOUR]).get("FLOUR".toLowerCase())).toBe(FLOUR);
  });
});

describe("localizeIngredientItem", () => {
  it("localizes an english stored item to ukrainian", () => {
    expect(localizeIngredientItem("Flour", index, "ua")).toBe(
      "борошно універсальне",
    );
  });

  it("localizes a ukrainian stored item to english", () => {
    expect(localizeIngredientItem("борошно", index, "en")).toBe(
      "all-purpose flour",
    );
  });

  it("leaves descriptive non-vocab text untouched", () => {
    expect(
      localizeIngredientItem("all-purpose flour, sifted", index, "ua"),
    ).toBe("all-purpose flour, sifted");
  });

  it("returns the original text when no vocab matches", () => {
    expect(localizeIngredientItem("dragonfruit", index, "ua")).toBe(
      "dragonfruit",
    );
  });
});
