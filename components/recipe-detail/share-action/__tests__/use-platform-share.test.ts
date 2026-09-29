import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePlatformShare } from "../use-platform-share";

const shareRecipe = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock("@/lib/platform", () => ({
  usePlatform: () => ({ share: { recipe: shareRecipe } }),
}));
vi.mock("sonner", () => ({ toast }));

const input = { id: "recipe-1", title: "Soup", url: "https://x/en/r" };

function renderShare() {
  return renderHook(() => usePlatformShare()).result.current;
}

describe("usePlatformShare", () => {
  beforeEach(() => {
    shareRecipe.mockResolvedValue("shared");
  });

  describe("when the platform shares", () => {
    it("hands the recipe to the platform", async () => {
      const share = renderShare();

      await share(input);

      expect(shareRecipe).toHaveBeenCalledExactlyOnceWith(input);
    });

    it("stays quiet after a native share", async () => {
      const share = renderShare();

      await share(input);

      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("tells the user when the platform copied the link instead", async () => {
      shareRecipe.mockResolvedValue("copied");
      const share = renderShare();

      await share(input);

      expect(toast.success).toHaveBeenCalledWith("linkCopied");
    });
  });

  describe("when the share fails", () => {
    it("re-throws the original cause so Sentry receives it", async () => {
      const cause = new Error("Telegram WebApp SDK unavailable");
      shareRecipe.mockRejectedValue(cause);
      const share = renderShare();

      await expect(share(input)).rejects.toBe(cause);
    });

    it("tells the user", async () => {
      shareRecipe.mockRejectedValue(new Error("offline"));
      const share = renderShare();

      await expect(share(input)).rejects.toThrow();

      expect(toast.error).toHaveBeenCalledWith("shareRecipeFailed");
    });
  });

  describe("when the user dismisses the share sheet", () => {
    it("neither reports nor re-throws the cancellation", async () => {
      shareRecipe.mockRejectedValue(new DOMException("cancel", "AbortError"));
      const share = renderShare();

      await expect(share(input)).resolves.toBeUndefined();

      expect(toast.error).not.toHaveBeenCalled();
    });
  });
});
