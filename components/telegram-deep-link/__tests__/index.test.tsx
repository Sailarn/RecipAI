import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resolveStartParamHref,
  TelegramDeepLink,
} from "@/components/telegram-deep-link";
import type { TelegramWebApp } from "@/lib/telegram/webapp";

const { telegramState, navigatePush } = vi.hoisted(() => ({
  telegramState: { webApp: undefined as TelegramWebApp | undefined },
  navigatePush: vi.fn(),
}));

vi.mock("@/components/telegram-provider", () => ({
  useTelegram: () => telegramState,
}));
vi.mock("@/lib/transitions", () => ({
  useNavigate: () => ({ push: navigatePush, back: vi.fn(), replace: vi.fn() }),
}));

function webAppWithStartParam(startParam: string | undefined): TelegramWebApp {
  return { initDataUnsafe: { start_param: startParam } } as TelegramWebApp;
}

afterEach(() => {
  telegramState.webApp = undefined;
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
    telegramState.webApp = webAppWithStartParam("pantry");

    render(<TelegramDeepLink />);

    expect(navigatePush).toHaveBeenCalledExactlyOnceWith("/en/pantry");
  });

  it("does not navigate without a start param", () => {
    telegramState.webApp = webAppWithStartParam(undefined);

    render(<TelegramDeepLink />);

    expect(navigatePush).not.toHaveBeenCalled();
  });

  it("stays inert outside Telegram", () => {
    telegramState.webApp = undefined;

    render(<TelegramDeepLink />);

    expect(navigatePush).not.toHaveBeenCalled();
  });
});
