/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedRecipe } from "@/lib/db/schema";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));
vi.mock("@/components/recipe-detail", () => ({
  RecipeDetail: () => <div data-testid="recipe-detail" />,
}));

const push = vi.hoisted(() => vi.fn());
vi.mock("@/lib/transitions", () => ({
  useNavigate: () => ({ push, back: vi.fn(), replace: vi.fn() }),
}));

import { ParseSavedCard } from "../index";

const recipe = {
  title: "Borscht",
  servings: 4,
  ingredients: [{ item: "beet", amount: 2 }],
  instructions: [{ order: 1, instruction: "Boil" }],
  sourceUrl: "https://example.com/borscht",
} as ParsedRecipe;

function renderCard(alreadySaved = false, onReset = vi.fn()) {
  render(
    <ParseSavedCard
      locale="en"
      recipeId="recipe-1"
      recipe={recipe}
      alreadySaved={alreadySaved}
      onReset={onReset}
    />,
  );
  return onReset;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ParseSavedCard", () => {
  it("shows the recipe and that it was saved", () => {
    renderCard();

    expect(screen.getByText("Borscht")).toBeInTheDocument();
    expect(screen.getByText("addedToRecipes")).toBeInTheDocument();
  });

  it("says when the link was already in the library", () => {
    renderCard(true);

    expect(screen.getByText("alreadySaved")).toBeInTheDocument();
  });

  it("opens the saved recipe on the navigation stack", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "savedCard.open" }));

    expect(push).toHaveBeenCalledWith(
      "/en/recipes/recipe-1",
      expect.anything(),
    );
  });

  it("returns to the form on Parse another", () => {
    const onReset = renderCard();

    fireEvent.click(
      screen.getByRole("button", { name: "savedCard.parseAnother" }),
    );

    expect(onReset).toHaveBeenCalledOnce();
  });
});
