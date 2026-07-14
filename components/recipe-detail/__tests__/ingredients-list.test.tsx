/**
 * @vitest-environment happy-dom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RecipeIngredient, RecipeSection } from "@/lib/db/schema";
import { IngredientsList } from "../ingredients-list";

const localeState = vi.hoisted(() => ({ current: "en" }));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => localeState.current,
}));

function renderList(
  ingredients: RecipeIngredient[],
  sections: RecipeSection[] = [],
  locale = "en",
) {
  localeState.current = locale;
  return render(
    <IngredientsList ingredients={ingredients} sections={sections} />,
  );
}

describe("IngredientsList", () => {
  it("renders a modifier chip with the English label", () => {
    renderList(
      [{ id: "1", item: "Mozzarella", modifiers: ["GRATED"] }],
      [],
      "en",
    );

    expect(screen.getByText("grated")).toBeInTheDocument();
  });

  it("renders one chip per modifier", () => {
    renderList([{ id: "1", item: "Butter", modifiers: ["COLD", "SLICED"] }]);

    expect(screen.getByText("cold")).toBeInTheDocument();
    expect(screen.getByText("sliced")).toBeInTheDocument();
  });

  it("renders the modifier chip with the Ukrainian label", () => {
    renderList(
      [{ id: "1", item: "Mozzarella", modifiers: ["GRATED"] }],
      [],
      "ua",
    );

    expect(screen.getByText("тертий")).toBeInTheDocument();
  });

  it("shows the original wording when it differs from item", () => {
    renderList([
      {
        id: "1",
        item: "Mozzarella",
        modifiers: ["GRATED"],
        original: "Grated Mozzarella",
      },
    ]);

    expect(screen.getByText("Grated Mozzarella")).toBeInTheDocument();
  });

  it("renders section headers when there is more than one section", () => {
    const sections: RecipeSection[] = [
      { id: "s1", name: "For the base", order: 0 },
      { id: "s2", name: "Sauce", order: 1 },
    ];
    renderList(
      [
        { id: "1", item: "Flour", sectionId: "s1" },
        { id: "2", item: "Tomato", sectionId: "s2" },
      ],
      sections,
    );

    expect(screen.getByText("For the base")).toBeInTheDocument();
    expect(screen.getByText("Sauce")).toBeInTheDocument();
  });

  it("renders no section header when there is a single section", () => {
    const sections: RecipeSection[] = [
      { id: "s1", name: "For the base", order: 0 },
    ];
    renderList(
      [
        { id: "1", item: "Flour", sectionId: "s1" },
        { id: "2", item: "Water", sectionId: "s1" },
      ],
      sections,
    );

    expect(screen.queryByText("For the base")).not.toBeInTheDocument();
  });

  it("labels ungrouped ingredients under a Main header when sections exist", () => {
    renderList(
      [
        { id: "1", item: "Flour", sectionId: "s1" },
        { id: "2", item: "Salt" },
      ],
      [{ id: "s1", name: "For the base", order: 0 }],
    );

    expect(screen.getByText("For the base")).toBeInTheDocument();
    expect(screen.getByText("mainSection")).toBeInTheDocument();
  });

  it("shows no Main header for a flat recipe with no sections", () => {
    renderList([
      { id: "1", item: "Flour" },
      { id: "2", item: "Salt" },
    ]);

    expect(screen.queryByText("mainSection")).not.toBeInTheDocument();
  });
});
