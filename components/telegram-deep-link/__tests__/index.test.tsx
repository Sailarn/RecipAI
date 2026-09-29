import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resolveStartParamHref,
  TelegramDeepLink,
} from "@/components/telegram-deep-link";

const { launchState, navigateReplace, navigatePush, loadTelegramSdk } =
  vi.hoisted(() => ({
    launchState: {
      isTelegram: false,
      startParam: undefined as string | undefined,
    },
    navigateReplace: vi.fn(),
    navigatePush: vi.fn(),
    loadTelegramSdk: vi.fn(),
  }));

vi.mock("@/lib/telegram/webapp", () => ({
  isTelegramEnvironment: () => launchState.isTelegram,
  getLaunchStartParam: () => launchState.startParam,
  loadTelegramSdk,
}));
vi.mock("@/lib/transitions", () => ({
  useNavigate: () => ({
    push: navigatePush,
    back: vi.fn(),
    replace: navigateReplace,
  }),
}));
vi.mock("@/components/recipe-detail", () => ({
  RecipeDetail: (props: { recipeId: string; locale: string }) => props,
}));

beforeEach(() => {
  loadTelegramSdk.mockResolvedValue(undefined);
});

afterEach(() => {
  launchState.isTelegram = false;
  launchState.startParam = undefined;
});

describe("resolveStartParamHref", () => {
  it("returns null for empty or unknown params", () => {
    expect(resolveStartParamHref(undefined, "en")).toBeNull();
    expect(resolveStartParamHref("nonsense", "en")).toBeNull();
    expect(resolveStartParamHref("recipe_", "en")).toBeNull();
  });

  it("maps known destinations", () => {
    expect(resolveStartParamHref("pantry", "en")).toBe("/en/pantry");
    expect(resolveStartParamHref("parse", "uk")).toBe("/uk/recipes/parse");
    expect(resolveStartParamHref("profile", "en")).toBe("/en/profile");
  });

  it("maps a recipe id", () => {
    expect(resolveStartParamHref("recipe_abc123", "en")).toBe(
      "/en/recipes/abc123",
    );
  });
});

describe("TelegramDeepLink", () => {
  it("navigates once to the resolved destination", async () => {
    launchState.isTelegram = true;
    launchState.startParam = "pantry";

    render(<TelegramDeepLink />);

    await waitFor(() =>
      expect(navigateReplace).toHaveBeenCalledExactlyOnceWith("/en/pantry"),
    );
  });

  it("pushes a recipe deep link over the recipes list, not a replace", async () => {
    launchState.isTelegram = true;
    launchState.startParam = "recipe_abc123";

    render(<TelegramDeepLink />);

    await waitFor(() => expect(navigatePush).toHaveBeenCalledTimes(1));
    expect(navigateReplace).not.toHaveBeenCalled();
    const [href, element] = navigatePush.mock.calls[0];
    expect(href).toBe("/en/recipes/abc123");
    expect(element.props).toMatchObject({ recipeId: "abc123", locale: "en" });
  });

  describe("SDK ordering", () => {
    it("waits for the SDK to execute before rewriting the URL", async () => {
      let finishSdkLoad: (value: undefined) => void = () => {};
      loadTelegramSdk.mockReturnValue(
        new Promise((resolve) => {
          finishSdkLoad = resolve;
        }),
      );
      launchState.isTelegram = true;
      launchState.startParam = "recipe_abc123";

      render(<TelegramDeepLink />);
      await Promise.resolve();

      expect(loadTelegramSdk).toHaveBeenCalledTimes(1);
      expect(navigatePush).not.toHaveBeenCalled();

      finishSdkLoad(undefined);

      await waitFor(() => expect(navigatePush).toHaveBeenCalledTimes(1));
    });

    it("waits for the SDK before a tab-root replace too", async () => {
      let finishSdkLoad: (value: undefined) => void = () => {};
      loadTelegramSdk.mockReturnValue(
        new Promise((resolve) => {
          finishSdkLoad = resolve;
        }),
      );
      launchState.isTelegram = true;
      launchState.startParam = "pantry";

      render(<TelegramDeepLink />);
      await Promise.resolve();

      expect(navigateReplace).not.toHaveBeenCalled();

      finishSdkLoad(undefined);

      await waitFor(() =>
        expect(navigateReplace).toHaveBeenCalledExactlyOnceWith("/en/pantry"),
      );
    });

    it("still opens the deep link when the SDK fails to load", async () => {
      loadTelegramSdk.mockRejectedValue(
        new Error("Failed to load Telegram WebApp SDK"),
      );
      launchState.isTelegram = true;
      launchState.startParam = "recipe_abc123";

      render(<TelegramDeepLink />);

      await waitFor(() => expect(navigatePush).toHaveBeenCalledTimes(1));
    });
  });

  it("does not navigate without a start param", () => {
    launchState.isTelegram = true;
    launchState.startParam = undefined;

    render(<TelegramDeepLink />);

    expect(navigateReplace).not.toHaveBeenCalled();
    expect(navigatePush).not.toHaveBeenCalled();
  });

  it("stays inert outside Telegram", () => {
    launchState.isTelegram = false;
    launchState.startParam = "recipe_abc";

    render(<TelegramDeepLink />);

    expect(navigateReplace).not.toHaveBeenCalled();
  });
});
