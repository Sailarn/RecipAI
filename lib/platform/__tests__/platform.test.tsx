import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlatformProvider, useFeature } from "@/lib/platform";
import { createTelegramPlatform } from "@/lib/platform/telegram";
import { createWebPlatform } from "@/lib/platform/web";
import type { TelegramWebApp } from "@/lib/telegram/webapp";

const { telegramState } = vi.hoisted(() => ({
  telegramState: { webApp: undefined as TelegramWebApp | undefined },
}));

vi.mock("@/components/telegram-provider", () => ({
  useTelegram: () => telegramState,
}));

afterEach(() => {
  telegramState.webApp = undefined;
  vi.restoreAllMocks();
});

describe("createWebPlatform", () => {
  it("no-ops haptics", () => {
    const platform = createWebPlatform();

    expect(() => {
      platform.haptics.impact("light");
      platform.haptics.notify("success");
      platform.haptics.selection();
    }).not.toThrow();
    expect(platform.kind).toBe("web");
  });

  it("shares via the Web Share API when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });
    const platform = createWebPlatform();

    const result = await platform.share.recipe({ title: "Soup", url: "u" });

    expect(share).toHaveBeenCalledWith({ title: "Soup", url: "u" });
    expect(result).toBe("shared");
    vi.unstubAllGlobals();
  });

  it("falls back to clipboard when Web Share is absent", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const platform = createWebPlatform();

    const result = await platform.share.recipe({ title: "Soup", url: "u" });

    expect(writeText).toHaveBeenCalledWith("u");
    expect(result).toBe("copied");
    vi.unstubAllGlobals();
  });
});

describe("createTelegramPlatform", () => {
  it("routes haptics to the native SDK", () => {
    const haptic = {
      impactOccurred: vi.fn(),
      notificationOccurred: vi.fn(),
      selectionChanged: vi.fn(),
    };
    const platform = createTelegramPlatform({
      HapticFeedback: haptic,
    } as unknown as TelegramWebApp);

    platform.haptics.impact("medium");
    platform.haptics.notify("success");
    platform.haptics.selection();

    expect(haptic.impactOccurred).toHaveBeenCalledWith("medium");
    expect(haptic.notificationOccurred).toHaveBeenCalledWith("success");
    expect(haptic.selectionChanged).toHaveBeenCalledOnce();
  });

  it("shares through the native Telegram sheet", async () => {
    const openTelegramLink = vi.fn();
    const platform = createTelegramPlatform({
      openTelegramLink,
    } as unknown as TelegramWebApp);

    const result = await platform.share.recipe({ title: "Soup", url: "u" });

    expect(openTelegramLink).toHaveBeenCalledWith(
      expect.stringContaining("https://t.me/share/url?url=u"),
    );
    expect(result).toBe("shared");
  });
});

describe("useFeature", () => {
  it("reflects the web feature map by default", () => {
    telegramState.webApp = undefined;

    const { result } = renderHook(
      () => ({
        signIn: useFeature("signInOptions"),
        linking: useFeature("accountLinking"),
        push: useFeature("pushNotifications"),
        install: useFeature("pwaInstall"),
      }),
      { wrapper: PlatformProvider },
    );

    expect(result.current).toEqual({
      signIn: true,
      linking: true,
      push: true,
      install: true,
    });
  });

  it("disables those surfaces in Telegram", () => {
    telegramState.webApp = { initData: "x" } as TelegramWebApp;

    const { result } = renderHook(
      () => ({
        signIn: useFeature("signInOptions"),
        linking: useFeature("accountLinking"),
        push: useFeature("pushNotifications"),
        install: useFeature("pwaInstall"),
      }),
      { wrapper: PlatformProvider },
    );

    expect(result.current).toEqual({
      signIn: false,
      linking: false,
      push: false,
      install: false,
    });
  });
});
