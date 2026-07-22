import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { navigateReplace, resolveLaunchLocale, getLaunchStartParam, tg } =
  vi.hoisted(() => ({
    navigateReplace: vi.fn(),
    resolveLaunchLocale: vi.fn(),
    getLaunchStartParam: vi.fn(),
    tg: { webApp: undefined as unknown },
  }));

vi.mock("@/lib/transitions", () => ({
  useNavigate: () => ({
    push: vi.fn(),
    back: vi.fn(),
    replace: navigateReplace,
  }),
}));
vi.mock("@/components/telegram-provider", () => ({ useTelegram: () => tg }));
vi.mock("@/lib/telegram/launch-locale", () => ({ resolveLaunchLocale }));
vi.mock("@/lib/telegram/webapp", () => ({ getLaunchStartParam }));

import { swapLocale, TelegramLocaleSync } from "../index";

beforeEach(() => {
  window.history.replaceState(null, "", "/ua/recipes");
  getLaunchStartParam.mockReturnValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
  tg.webApp = undefined;
});

describe("swapLocale", () => {
  it("swaps the leading locale segment", () => {
    expect(swapLocale("/ua/recipes", "en")).toBe("/en/recipes");
    expect(swapLocale("/ua", "en")).toBe("/en");
  });
});

describe("TelegramLocaleSync", () => {
  it("does nothing before the SDK is available", () => {
    tg.webApp = undefined;

    render(<TelegramLocaleSync />);

    expect(navigateReplace).not.toHaveBeenCalled();
  });

  it("redirects to the resolved locale when it differs from the launch URL", async () => {
    tg.webApp = {};
    resolveLaunchLocale.mockResolvedValue("en");

    render(<TelegramLocaleSync />);

    await waitFor(() =>
      expect(navigateReplace).toHaveBeenCalledWith("/en/recipes"),
    );
  });

  it("does not redirect when the resolved locale already matches", async () => {
    tg.webApp = {};
    resolveLaunchLocale.mockResolvedValue("ua");

    render(<TelegramLocaleSync />);

    await waitFor(() => expect(resolveLaunchLocale).toHaveBeenCalled());
    expect(navigateReplace).not.toHaveBeenCalled();
  });

  it("defers to a deep link without resolving or redirecting", async () => {
    tg.webApp = {};
    getLaunchStartParam.mockReturnValue("recipe_x");

    render(<TelegramLocaleSync />);

    await Promise.resolve();
    expect(resolveLaunchLocale).not.toHaveBeenCalled();
    expect(navigateReplace).not.toHaveBeenCalled();
  });
});
