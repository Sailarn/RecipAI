/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParseText } from "../index";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/transitions", () => ({
  useNavigate: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/components/parse-background-banner", () => ({
  ParseBackgroundBanner: () => <div data-testid="parsing-banner" />,
}));

const { parseRecipeFromText, saveDirectParseResult, recordParseHistory } =
  vi.hoisted(() => ({
    parseRecipeFromText: vi.fn(),
    saveDirectParseResult: vi.fn(),
    recordParseHistory: vi.fn(),
  }));
vi.mock("@/lib/parse-recipe/text", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/parse-recipe/text")>()),
  parseRecipeFromText,
}));
vi.mock("@/lib/parse-recipe/save-direct-parse-result", () => ({
  saveDirectParseResult,
}));
vi.mock("@/lib/db/parse-history", () => ({ recordParseHistory }));

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/telemetry", () => ({ trackEvent }));

const recipeText =
  "Pancakes\n- 200 g flour\n- 2 eggs\n1. Whisk everything.\n2. Fry.";
const recipe = {
  title: "Pancakes",
  servings: null,
  ingredients: [{ item: "flour" }],
  instructions: [{ order: 1, instruction: "Whisk" }],
};

function typeRecipe(text: string) {
  fireEvent.change(screen.getByLabelText("text.label"), {
    target: { value: text },
  });
}

beforeEach(() => {
  recordParseHistory.mockResolvedValue(undefined);
  saveDirectParseResult.mockResolvedValue(undefined);
});

describe("ParseText", () => {
  describe("submit availability", () => {
    it("stays disabled until the text could plausibly hold a recipe", () => {
      render(<ParseText locale="en" />);
      const submit = screen.getByRole("button", { name: /analyzeWithAi/ });

      typeRecipe("eggs");

      expect(submit).toBeDisabled();
    });

    it("enables once a recipe-sized text is pasted", () => {
      render(<ParseText locale="en" />);

      typeRecipe(recipeText);

      expect(
        screen.getByRole("button", { name: /analyzeWithAi/ }),
      ).toBeEnabled();
    });
  });

  describe("parsing", () => {
    it("sends the pasted text and queues the result for review", async () => {
      parseRecipeFromText.mockResolvedValue(recipe);
      render(<ParseText locale="en" />);
      typeRecipe(recipeText);

      fireEvent.click(screen.getByRole("button", { name: /analyzeWithAi/ }));

      await waitFor(() =>
        expect(saveDirectParseResult).toHaveBeenCalledWith(
          recipe,
          "en",
          expect.any(Object),
        ),
      );
      expect(parseRecipeFromText).toHaveBeenCalledWith(
        recipeText,
        expect.any(String),
      );
      expect(trackEvent).toHaveBeenCalledWith("parse_started", {
        source: "text",
      });
    });

    it("shows the error and records a failed text import", async () => {
      parseRecipeFromText.mockRejectedValue(
        new Error("Couldn't extract a recipe from this text"),
      );
      render(<ParseText locale="en" />);
      typeRecipe(recipeText);

      fireEvent.click(screen.getByRole("button", { name: /analyzeWithAi/ }));

      expect(
        await screen.findByText("Couldn't extract a recipe from this text"),
      ).toBeInTheDocument();
      expect(recordParseHistory).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Text import", status: "failed" }),
      );
    });
  });
});
