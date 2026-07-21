import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resolveStartParamHref,
  TelegramDeepLink,
} from "@/components/telegram-deep-link";

const { launchState, navigateReplace } = vi.hoisted(() => ({
  launchState: {
    isTelegram: false,
    startParam: undefined as string | undefined,
  },
  navigateReplace: vi.fn(),
}));

vi.mock("@/lib/telegram/webapp", () => ({
  isTelegramEnvironment: () => launchState.isTelegram,
  getLaunchStartParam: () => launchState.startParam,
}));
vi.mock("@/lib/transitions", () => ({
  useNavigate: () => ({
    push: vi.fn(),
    back: vi.fn(),
    replace: navigateReplace,
  }),
}));

afterEach(() => {
  launchState.isTelegram = false;
  launchState.startParam = undefined;
  vi.clearAllMocks();
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
  it("navigates once to the resolved destination", () => {
    launchState.isTelegram = true;
    launchState.startParam = "pantry";

    render(<TelegramDeepLink />);

    expect(navigateReplace).toHaveBeenCalledExactlyOnceWith("/en/pantry");
  });

  it("does not navigate without a start param", () => {
    launchState.isTelegram = true;
    launchState.startParam = undefined;

    render(<TelegramDeepLink />);

    expect(navigateReplace).not.toHaveBeenCalled();
  });

  it("stays inert outside Telegram", () => {
    launchState.isTelegram = false;
    launchState.startParam = "recipe_abc";

    render(<TelegramDeepLink />);

    expect(navigateReplace).not.toHaveBeenCalled();
  });
});
