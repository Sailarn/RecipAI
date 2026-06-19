import { describe, expect, it } from "vitest";
import type { PantryItem, VocabularyIngredient } from "@/lib/db/schema";
import { localizedPantryName } from "../localized-name";

function makeItem(overrides: Partial<PantryItem> = {}): PantryItem {
  return {
    id: "p1",
    ingredientId: "tomato-id",
    name: "Tomato",
    qty: 1,
    unit: "pcs",
    cat: "Produce",
    on: true,
    addedAt: new Date(),
    ...overrides,
  };
}

const tomato: VocabularyIngredient = {
  id: "tomato-id",
  en: "Tomato",
  ua: "Помідор",
  category: "Produce",
  aliasesEn: [],
  aliasesUa: [],
};

const vocabById = new Map<string, VocabularyIngredient>([
  ["tomato-id", tomato],
]);

describe("localizedPantryName", () => {
  it("returns the Ukrainian name for the ua locale", () => {
    expect(localizedPantryName(makeItem(), vocabById, "ua")).toBe("Помідор");
  });

  it("returns the English name for the en locale", () => {
    expect(localizedPantryName(makeItem(), vocabById, "en")).toBe("Tomato");
  });

  it("falls back to English when the Ukrainian name is missing", () => {
    const onlyEn = new Map<string, VocabularyIngredient>([
      ["salt-id", { ...tomato, id: "salt-id", en: "Salt", ua: null }],
    ]);

    expect(
      localizedPantryName(
        makeItem({ ingredientId: "salt-id", name: "Salt" }),
        onlyEn,
        "ua",
      ),
    ).toBe("Salt");
  });

  it("falls back to the stored name when there is no vocab match", () => {
    expect(
      localizedPantryName(
        makeItem({ ingredientId: "unknown-id", name: "Tajín" }),
        vocabById,
        "ua",
      ),
    ).toBe("Tajín");
  });

  it("falls back to the stored name when the item has no ingredientId", () => {
    expect(
      localizedPantryName(
        makeItem({ ingredientId: undefined, name: "Mystery spice" }),
        vocabById,
        "ua",
      ),
    ).toBe("Mystery spice");
  });
});
