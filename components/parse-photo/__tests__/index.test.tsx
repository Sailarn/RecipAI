/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParsePhoto } from "../index";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/transitions", () => ({
  useNavigate: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/components/parse-background-banner", () => ({
  ParseBackgroundBanner: () => <div data-testid="parsing-banner" />,
}));

const { parseRecipeFromPhoto, saveParsedResult, recordParseHistory } =
  vi.hoisted(() => ({
    parseRecipeFromPhoto: vi.fn(),
    saveParsedResult: vi.fn(),
    recordParseHistory: vi.fn(),
  }));
vi.mock("@/lib/parse-recipe/photo", () => ({ parseRecipeFromPhoto }));
vi.mock("@/lib/db/save-parsed-recipe", () => ({ saveParsedResult }));
vi.mock("@/lib/parse-recipe/announce-parse", () => ({
  announceSavedParse: vi.fn(),
  announceFailedParse: vi.fn(),
}));
vi.mock("@/components/parse-saved-card", () => ({
  ParseSavedCard: ({
    recipe,
    onReset,
  }: {
    recipe: { title: string };
    onReset: () => void;
  }) => (
    <div data-testid="saved-card">
      {recipe.title}
      <button type="button" onClick={onReset}>
        parse another
      </button>
    </div>
  ),
}));
vi.mock("@/lib/db/parse-history", () => ({ recordParseHistory }));

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/telemetry", () => ({ trackEvent }));

const recipe = {
  title: "Pasta",
  servings: 2,
  ingredients: [{ item: "pasta" }],
  instructions: [{ order: 1, instruction: "Boil" }],
};

function choosePhoto(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error("file input missing");
  const file = new File(["x"], "dish.jpg", { type: "image/jpeg" });
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
  recordParseHistory.mockResolvedValue(undefined);
  saveParsedResult.mockResolvedValue({
    recipeId: "recipe-1",
    alreadySaved: false,
  });
});

describe("ParsePhoto", () => {
  describe("before a photo is chosen", () => {
    it("keeps the analyze button disabled", () => {
      render(<ParsePhoto locale="en" />);

      expect(
        screen.getByRole("button", { name: /analyzeWithAi/ }),
      ).toBeDisabled();
    });
  });

  describe("on a successful parse", () => {
    it("parses the chosen photo, saves it and shows the saved card", async () => {
      parseRecipeFromPhoto.mockResolvedValue(recipe);
      const { container } = render(<ParsePhoto locale="en" />);
      const file = choosePhoto(container);

      fireEvent.click(screen.getByRole("button", { name: /analyzeWithAi/ }));

      expect(await screen.findByTestId("saved-card")).toHaveTextContent(
        "Pasta",
      );
      expect(saveParsedResult).toHaveBeenCalledWith({
        ...recipe,
        sourceUrl: "",
      });
      expect(parseRecipeFromPhoto).toHaveBeenCalledWith(
        file,
        expect.any(String),
      );
      expect(trackEvent).toHaveBeenCalledWith("parse_started", {
        source: "photo",
      });
      expect(trackEvent).toHaveBeenCalledWith("parse_succeeded", {
        source: "photo",
      });
      expect(recordParseHistory).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Pasta", status: "done" }),
      );
    });

    it("returns to the form on Parse another", async () => {
      parseRecipeFromPhoto.mockResolvedValue(recipe);
      const { container } = render(<ParsePhoto locale="en" />);
      choosePhoto(container);
      fireEvent.click(screen.getByRole("button", { name: /analyzeWithAi/ }));
      await screen.findByTestId("saved-card");

      fireEvent.click(screen.getByRole("button", { name: "parse another" }));

      expect(screen.queryByTestId("saved-card")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /analyzeWithAi/ }),
      ).toBeInTheDocument();
    });
  });

  describe("on a failed parse", () => {
    it("shows the error and records a failed import", async () => {
      parseRecipeFromPhoto.mockRejectedValue(new Error("Gemini is busy"));
      const { container } = render(<ParsePhoto locale="en" />);
      choosePhoto(container);

      fireEvent.click(screen.getByRole("button", { name: /analyzeWithAi/ }));

      expect(await screen.findByText("Gemini is busy")).toBeInTheDocument();
      expect(trackEvent).toHaveBeenCalledWith("parse_failed", {
        source: "photo",
        reason: "Gemini is busy",
      });
      expect(recordParseHistory).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Photo import", status: "failed" }),
      );
    });
  });
});
