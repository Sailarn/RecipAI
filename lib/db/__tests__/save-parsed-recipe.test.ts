import "./test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveParsedRecipe } from "../save-parsed-recipe";
import type { ParsedRecipeEntry } from "../schema";

vi.mock("../recipes", () => ({
  createRecipe: vi.fn().mockResolvedValue("new-recipe-id"),
  updateRecipe: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../upload/images", () => ({
  uploadImage: vi.fn(),
  isImageKitUrl: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/parse-recipe/normalize-ingredients", () => ({
  normalizeRecipeIngredients: vi
    .fn()
    .mockResolvedValue({ matched: 0, total: 0 }),
}));

import { normalizeRecipeIngredients } from "@/lib/parse-recipe/normalize-ingredients";
import { isImageKitUrl, uploadImage } from "../../upload/images";
import { createRecipe, updateRecipe } from "../recipes";

const baseEntry: ParsedRecipeEntry = {
  id: "parsed-1",
  title: "Pasta Carbonara",
  description: "Classic Italian pasta",
  servings: 4,
  prepTime: 10,
  cookTime: 20,
  ingredients: [
    { item: "pasta", amount: 400, unit: "g" },
    { item: "eggs", amount: 3 },
  ],
  instructions: [
    { order: 1, instruction: "Boil water" },
    { order: 2, instruction: "Cook pasta" },
  ],
  sourceUrl: "https://example.com/recipe",
  category: "main",
  createdAt: new Date("2024-01-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createRecipe).mockResolvedValue("new-recipe-id");
  vi.mocked(updateRecipe).mockResolvedValue(undefined);
  vi.mocked(isImageKitUrl).mockReturnValue(false);
});

describe("saveParsedRecipe", () => {
  describe("createRecipe mapping", () => {
    it("calls createRecipe with title, description, servings and other fields", async () => {
      await saveParsedRecipe(baseEntry);

      expect(createRecipe).toHaveBeenCalledOnce();
      const arg = vi.mocked(createRecipe).mock.calls[0][0];
      expect(arg.title).toBe("Pasta Carbonara");
      expect(arg.description).toBe("Classic Italian pasta");
      expect(arg.servings).toBe(4);
      expect(arg.sourceUrl).toBe("https://example.com/recipe");
      expect(arg.category).toBe("main");
    });

    it("computes totalTime as prepTime + cookTime", async () => {
      await saveParsedRecipe(baseEntry);

      const arg = vi.mocked(createRecipe).mock.calls[0][0];
      expect(arg.totalTime).toBe(30);
    });

    it("sets totalTime to undefined when both times are 0/missing", async () => {
      await saveParsedRecipe({ ...baseEntry, prepTime: 0, cookTime: 0 });

      const arg = vi.mocked(createRecipe).mock.calls[0][0];
      expect(arg.totalTime).toBeUndefined();
    });

    it("maps ingredients with generated ids", async () => {
      await saveParsedRecipe(baseEntry);

      const arg = vi.mocked(createRecipe).mock.calls[0][0];
      expect(arg.ingredients).toHaveLength(2);
      expect(arg.ingredients[0].item).toBe("pasta");
      expect(arg.ingredients[0].amount).toBe(400);
      expect(arg.ingredients[0].unit).toBe("g");
      expect(arg.ingredients[0].id).toBeDefined();
      expect(arg.ingredients[1].item).toBe("eggs");
      expect(arg.ingredients[1].amount).toBe(3);
    });

    it("maps instructions with 1-based order", async () => {
      await saveParsedRecipe(baseEntry);

      const arg = vi.mocked(createRecipe).mock.calls[0][0];
      expect(arg.instructions).toHaveLength(2);
      expect(arg.instructions[0].instruction).toBe("Boil water");
      expect(arg.instructions[0].order).toBe(1);
      expect(arg.instructions[1].instruction).toBe("Cook pasta");
      expect(arg.instructions[1].order).toBe(2);
    });
  });

  describe("background image upload", () => {
    it("does not call uploadImage when no imageUrl is set", async () => {
      await saveParsedRecipe({ ...baseEntry, imageUrl: undefined });

      await vi.waitFor(() => expect(isImageKitUrl).not.toHaveBeenCalled());
      expect(uploadImage).not.toHaveBeenCalled();
    });

    it("does not upload when imageUrl is already an ImageKit URL", async () => {
      vi.mocked(isImageKitUrl).mockReturnValue(true);

      await saveParsedRecipe({
        ...baseEntry,
        imageUrl: "https://ik.imagekit.io/x/image.jpg",
      });

      await vi.waitFor(() => expect(isImageKitUrl).toHaveBeenCalled());
      expect(uploadImage).not.toHaveBeenCalled();
    });

    it("uploads non-ImageKit imageUrl and updates recipe", async () => {
      vi.mocked(uploadImage).mockResolvedValue({
        url: "https://ik.imagekit.io/x/uploaded.jpg",
        fileId: "file-123",
      });

      await saveParsedRecipe({
        ...baseEntry,
        imageUrl: "https://external.com/image.jpg",
      });

      await vi.waitFor(() => expect(updateRecipe).toHaveBeenCalled());

      expect(uploadImage).toHaveBeenCalledWith(
        "https://external.com/image.jpg",
        undefined,
      );
      const [id, updates] = vi.mocked(updateRecipe).mock.calls[0];
      expect(id).toBe("new-recipe-id");
      expect(updates.imageUrl).toBe("https://ik.imagekit.io/x/uploaded.jpg");
      expect(updates.imageFileId).toBe("file-123");
    });

    it("does not call updateRecipe when all images are already ImageKit URLs", async () => {
      vi.mocked(isImageKitUrl).mockReturnValue(true);

      await saveParsedRecipe({
        ...baseEntry,
        imageUrl: "https://ik.imagekit.io/x/image.jpg",
      });

      // wait a tick for the background IIFE to settle
      await new Promise((r) => setTimeout(r, 0));
      expect(updateRecipe).not.toHaveBeenCalled();
    });

    it("silently ignores uploadImage errors and does not update recipe", async () => {
      vi.mocked(uploadImage).mockRejectedValue(new Error("Upload failed"));

      await saveParsedRecipe({
        ...baseEntry,
        imageUrl: "https://external.com/image.jpg",
      });

      await vi.waitFor(() => expect(uploadImage).toHaveBeenCalled());
      // give the IIFE time to settle
      await new Promise((r) => setTimeout(r, 10));
      expect(updateRecipe).not.toHaveBeenCalled();
    });
  });

  describe("normalization", () => {
    it("calls normalizeRecipeIngredients after createRecipe with the recipe's ingredient items", async () => {
      await saveParsedRecipe(baseEntry);

      expect(normalizeRecipeIngredients).toHaveBeenCalledOnce();
      const [id, ingredients] = vi.mocked(normalizeRecipeIngredients).mock
        .calls[0];
      expect(id).toBe("new-recipe-id");
      expect(ingredients.map((i) => i.item)).toEqual(["pasta", "eggs"]);
    });

    it("does not await normalizeRecipeIngredients — saveParsedRecipe resolves before normalization completes", async () => {
      let resolveNormalize!: (value: {
        matched: number;
        total: number;
      }) => void;
      vi.mocked(normalizeRecipeIngredients).mockReturnValue(
        new Promise<{ matched: number; total: number }>((res) => {
          resolveNormalize = res;
        }),
      );

      // saveParsedRecipe must resolve even though normalization is still pending
      await saveParsedRecipe(baseEntry);

      // Normalization was called but not yet resolved
      expect(normalizeRecipeIngredients).toHaveBeenCalledOnce();
      // Unblock it so the test doesn't leave a dangling promise
      resolveNormalize({ matched: 0, total: 0 });
    });
  });
});
