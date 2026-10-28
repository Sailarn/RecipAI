/**
 * @vitest-environment happy-dom
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/recipes", () => ({
  updateRecipe: vi.fn(),
}));

vi.mock("@/lib/parse-recipe/normalize-ingredients", () => ({
  normalizeRecipeIngredients: vi
    .fn()
    .mockResolvedValue({ matched: 0, provisional: 0 }),
}));

vi.mock("@/lib/platform", () => ({
  useHaptics: vi.fn().mockReturnValue({
    impact: vi.fn(),
    notify: vi.fn(),
    selection: vi.fn(),
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/lib/telemetry", () => ({
  captureError: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/transitions", () => ({
  useNavigate: vi
    .fn()
    .mockReturnValue({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

vi.mock("../resolve-recipe-images", () => ({
  resolveMainImage: vi.fn(),
  resolveInstructionImages: vi.fn(),
}));

import { toast } from "sonner";
import { updateRecipe } from "@/lib/db/recipes";
import { useHaptics } from "@/lib/platform";
import { useNavigate } from "@/lib/transitions";
import {
  resolveInstructionImages,
  resolveMainImage,
} from "../resolve-recipe-images";
import type { RecipeOutput } from "../schema";
import { useRecipeSave } from "../use-recipe-save";

const baseData: RecipeOutput = {
  title: "Toast",
  servings: 2,
  ingredients: [{ item: "bread", amount: undefined }],
  instructions: [],
  sections: [],
};
const recipe = { id: "recipe-1", imageFileId: "old-file" } as never;

function mockSuccessfulImages() {
  vi.mocked(resolveMainImage).mockResolvedValue({
    imageUrl: "https://ik.imagekit.io/test/photo.jpg",
    imageFileId: "file-1",
    uploadFailed: false,
  });
  vi.mocked(resolveInstructionImages).mockResolvedValue({
    instructions: [],
    uploadFailed: false,
  });
}

beforeEach(() => {
  vi.mocked(updateRecipe).mockResolvedValue(undefined);
  mockSuccessfulImages();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useRecipeSave", () => {
  it("saves, confirms with a toast, and navigates back immediately when nothing fails", async () => {
    const { result } = renderHook(() => useRecipeSave(recipe));

    await act(async () => {
      await result.current.onSubmit(baseData);
    });

    expect(updateRecipe).toHaveBeenCalledOnce();
    expect(result.current.saveState).toBe("saved");
    expect(result.current.imageError).toBeNull();
    expect(useHaptics().notify).toHaveBeenCalledWith("success");
    expect(toast.success).toHaveBeenCalledWith("updated");
    expect(useNavigate().back).toHaveBeenCalledOnce();
  });

  it("keeps the user on the form with a visible error when the main image upload fails", async () => {
    vi.mocked(resolveMainImage).mockResolvedValue({
      imageUrl: "",
      imageFileId: undefined,
      uploadFailed: true,
    });
    const { result } = renderHook(() => useRecipeSave(recipe));

    await act(async () => {
      await result.current.onSubmit(baseData);
    });

    expect(updateRecipe).toHaveBeenCalledOnce();
    expect(result.current.saveState).toBe("idle");
    expect(result.current.imageError).toBe("photoUploadFailed");
    expect(useHaptics().notify).toHaveBeenCalledWith("error");
    expect(useNavigate().back).not.toHaveBeenCalled();
  });

  it("keeps the user on the form with a visible error when a step image upload fails", async () => {
    vi.mocked(resolveInstructionImages).mockResolvedValue({
      instructions: [],
      uploadFailed: true,
    });
    const { result } = renderHook(() => useRecipeSave(recipe));

    await act(async () => {
      await result.current.onSubmit(baseData);
    });

    expect(result.current.saveState).toBe("idle");
    expect(result.current.imageError).toBe("photoUploadFailed");
    expect(useNavigate().back).not.toHaveBeenCalled();
  });

  it("updates the recipe by id", async () => {
    const { result } = renderHook(() => useRecipeSave(recipe));

    await act(async () => {
      await result.current.onSubmit(baseData);
    });

    expect(updateRecipe).toHaveBeenCalledWith(
      "recipe-1",
      expect.objectContaining({ title: "Toast" }),
    );
  });

  it("surfaces a save error and does not navigate when the DB write itself fails", async () => {
    vi.mocked(updateRecipe).mockRejectedValue(new Error("Dexie write failed"));
    const { result } = renderHook(() => useRecipeSave(recipe));

    await act(async () => {
      await result.current.onSubmit(baseData);
    });

    expect(result.current.saveState).toBe("idle");
    expect(result.current.imageError).toBe("saveFailed");
    expect(useHaptics().notify).toHaveBeenCalledWith("error");
    expect(useNavigate().back).not.toHaveBeenCalled();
  });
});
