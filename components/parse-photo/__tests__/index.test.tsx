/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const { parseRecipeFromPhoto, savePhotoParseResult, recordParseHistory } =
  vi.hoisted(() => ({
    parseRecipeFromPhoto: vi.fn(),
    savePhotoParseResult: vi.fn(),
    recordParseHistory: vi.fn(),
  }));
vi.mock("@/lib/parse-recipe/photo", () => ({ parseRecipeFromPhoto }));
vi.mock("@/lib/parse-recipe/save-photo-result", () => ({
  savePhotoParseResult,
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
  savePhotoParseResult.mockResolvedValue(undefined);
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
    it("parses the chosen photo and queues the result for review", async () => {
      parseRecipeFromPhoto.mockResolvedValue(recipe);
      const { container } = render(<ParsePhoto locale="en" />);
      const file = choosePhoto(container);

      fireEvent.click(screen.getByRole("button", { name: /analyzeWithAi/ }));

      await waitFor(() =>
        expect(savePhotoParseResult).toHaveBeenCalledWith(
          recipe,
          "en",
          expect.objectContaining({ fallbackTitle: "fallbackTitle" }),
        ),
      );
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

    it("hands the recipe to onResult instead of queuing when provided", async () => {
      parseRecipeFromPhoto.mockResolvedValue(recipe);
      const onResult = vi.fn();
      const { container } = render(
        <ParsePhoto locale="en" onResult={onResult} />,
      );
      choosePhoto(container);

      fireEvent.click(screen.getByRole("button", { name: /analyzeWithAi/ }));

      await waitFor(() => expect(onResult).toHaveBeenCalledWith(recipe));
      expect(savePhotoParseResult).not.toHaveBeenCalled();
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
