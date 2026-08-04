/**
 * @vitest-environment happy-dom
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Recipe } from "@/lib/db/schema";
import { useDeleteRecipe } from "../use-delete-recipe";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/lib/db/recipes", () => ({
  deleteRecipe: vi.fn(),
  discardRecipeImage: vi.fn(),
  restoreRecipe: vi.fn(),
}));

import { toast } from "sonner";
import {
  deleteRecipe,
  discardRecipeImage,
  restoreRecipe,
} from "@/lib/db/recipes";

const deletedRecipe = {
  id: "r1",
  title: "Borscht",
  servings: 4,
  ingredients: [],
  instructions: [],
  imageFileId: "file_1",
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Recipe;

/** Grab the Undo handler off the toast the hook raised. */
function getUndoHandler() {
  const options = vi.mocked(toast.success).mock.calls[0][1] as unknown as {
    action: { onClick: () => void };
  };
  return options.action.onClick;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.mocked(deleteRecipe).mockResolvedValue(deletedRecipe);
  vi.mocked(restoreRecipe).mockResolvedValue(undefined);
  vi.mocked(discardRecipeImage).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDeleteRecipe", () => {
  it("deletes the recipe and confirms with a toast", async () => {
    const { result } = renderHook(() => useDeleteRecipe());

    await act(async () => {
      await result.current("r1");
    });

    expect(deleteRecipe).toHaveBeenCalledWith("r1");
    expect(toast.success).toHaveBeenCalledOnce();
  });

  it("keeps the image until the undo window closes", async () => {
    const { result } = renderHook(() => useDeleteRecipe());

    await act(async () => {
      await result.current("r1");
    });

    expect(discardRecipeImage).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(6_000);
    });

    expect(discardRecipeImage).toHaveBeenCalledWith(deletedRecipe);
  });

  it("restores the recipe when undo is used", async () => {
    const { result } = renderHook(() => useDeleteRecipe());
    await act(async () => {
      await result.current("r1");
    });

    act(() => {
      getUndoHandler()();
    });

    expect(restoreRecipe).toHaveBeenCalledWith(deletedRecipe);
  });

  it("spares the image when undo is used", async () => {
    const { result } = renderHook(() => useDeleteRecipe());
    await act(async () => {
      await result.current("r1");
    });

    act(() => {
      getUndoHandler()();
    });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(discardRecipeImage).not.toHaveBeenCalled();
  });

  it("discards the image even if the caller navigated away", async () => {
    const { result, unmount } = renderHook(() => useDeleteRecipe());
    await act(async () => {
      await result.current("r1");
    });

    unmount();
    act(() => {
      vi.advanceTimersByTime(6_000);
    });

    expect(discardRecipeImage).toHaveBeenCalledWith(deletedRecipe);
  });

  it("does not offer undo when the recipe was already gone", async () => {
    vi.mocked(deleteRecipe).mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteRecipe());

    await act(async () => {
      await result.current("missing");
    });

    expect(toast.success).not.toHaveBeenCalled();
  });
});
