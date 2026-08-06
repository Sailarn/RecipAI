import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createRecipe,
  trackEvent,
  toastSuccess,
  toastError,
  clonePublicRecipe,
} = vi.hoisted(() => ({
  createRecipe: vi.fn(),
  trackEvent: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  clonePublicRecipe: vi.fn((recipe: unknown) => recipe),
}));

vi.mock("@/lib/db/recipes", () => ({ createRecipe }));
vi.mock("@/lib/public-recipes/clone", () => ({ clonePublicRecipe }));
vi.mock("@/lib/telemetry", () => ({ trackEvent }));
vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { useSaveSharedCopy } from "../use-save-shared-copy";

const recipe = { id: "recipe-1", title: "Fettuccine Alfredo" } as Parameters<
  typeof useSaveSharedCopy
>[0];

function renderSave() {
  return renderHook(() => useSaveSharedCopy(recipe)).result;
}

describe("useSaveSharedCopy", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("when the copy is written", () => {
    it("hands the new local id to the caller", async () => {
      createRecipe.mockResolvedValue("local-id");
      const onSaved = vi.fn();
      const result = renderSave();

      await result.current.saveCopy(onSaved);

      expect(onSaved).toHaveBeenCalledWith("local-id");
      expect(toastSuccess).toHaveBeenCalledWith("savedShared");
    });

    it("reports the save before the write and again on success", async () => {
      createRecipe.mockResolvedValue("local-id");
      const result = renderSave();

      await result.current.saveCopy(vi.fn());

      expect(trackEvent).toHaveBeenNthCalledWith(
        1,
        "shared_recipe_save_started",
      );
      expect(trackEvent).toHaveBeenNthCalledWith(
        2,
        "shared_recipe_save_succeeded",
        expect.objectContaining({ duration_ms: expect.any(Number) }),
      );
    });
  });

  describe("when the write fails", () => {
    it("re-throws the original cause so Sentry receives it", async () => {
      const cause = new Error("quota exceeded");
      createRecipe.mockRejectedValue(cause);
      const result = renderSave();

      await expect(result.current.saveCopy(vi.fn())).rejects.toBe(cause);
    });

    it("reports the failure and tells the user", async () => {
      createRecipe.mockRejectedValue(new Error("offline"));
      const result = renderSave();

      await expect(result.current.saveCopy(vi.fn())).rejects.toThrow();

      expect(trackEvent).toHaveBeenCalledWith("shared_recipe_save_failed");
      expect(toastError).toHaveBeenCalledWith("saveSharedFailed");
    });

    it("does not tell the caller a recipe was saved", async () => {
      createRecipe.mockRejectedValue(new Error("offline"));
      const onSaved = vi.fn();
      const result = renderSave();

      await expect(result.current.saveCopy(onSaved)).rejects.toThrow();

      expect(onSaved).not.toHaveBeenCalled();
    });
  });

  describe("when the write never settles", () => {
    it("records the attempt with no outcome", async () => {
      createRecipe.mockReturnValue(new Promise(() => {}));
      const result = renderSave();

      void result.current.saveCopy(vi.fn());
      await Promise.resolve();

      expect(trackEvent).toHaveBeenCalledTimes(1);
      expect(trackEvent).toHaveBeenCalledWith("shared_recipe_save_started");
    });
  });
});
