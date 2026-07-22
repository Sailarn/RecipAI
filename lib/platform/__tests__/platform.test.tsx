import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlatformProvider, useFeature } from "@/lib/platform";
import { createTelegramPlatform } from "@/lib/platform/telegram";
import { createWebPlatform } from "@/lib/platform/web";
import type { TelegramWebApp } from "@/lib/telegram/webapp";

const { telegramState, inTelegramEnvironment } = vi.hoisted(() => ({
  telegramState: { webApp: undefined as TelegramWebApp | undefined },
  inTelegramEnvironment: { value: false },
}));

vi.mock("@/components/telegram-provider", () => ({
  useTelegram: () => telegramState,
}));

vi.mock("@/lib/telegram/webapp", () => ({
  isTelegramEnvironment: () => inTelegramEnvironment.value,
}));

afterEach(() => {
  telegramState.webApp = undefined;
  inTelegramEnvironment.value = false;
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

    const result = await platform.share.recipe({
      id: "r1",
      title: "Soup",
      url: "u",
    });

    expect(share).toHaveBeenCalledWith({ title: "Soup", url: "u" });
    expect(result).toBe("shared");
    vi.unstubAllGlobals();
  });

  it("falls back to clipboard when Web Share is absent", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const platform = createWebPlatform();

    const result = await platform.share.recipe({
      id: "r1",
      title: "Soup",
      url: "u",
    });

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

  it("falls back to a link share when shareMessage is unsupported", async () => {
    const openTelegramLink = vi.fn();
    const platform = createTelegramPlatform({
      openTelegramLink,
    } as unknown as TelegramWebApp);

    const result = await platform.share.recipe({
      id: "r1",
      title: "Soup",
      url: "u",
    });

    expect(openTelegramLink).toHaveBeenCalledWith(
      expect.stringContaining("https://t.me/share/url?url=u"),
    );
    expect(result).toBe("shared");
  });

  it("shares a prepared card via shareMessage when supported", async () => {
    const shareMessage = vi.fn();
    const openTelegramLink = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ preparedMessageId: "pmi-1" }),
      }),
    );
    const platform = createTelegramPlatform({
      shareMessage,
      openTelegramLink,
    } as unknown as TelegramWebApp);

    const result = await platform.share.recipe({
      id: "r1",
      title: "Soup",
      url: "u",
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/telegram/share-recipe",
      expect.objectContaining({ method: "POST" }),
    );
    expect(shareMessage).toHaveBeenCalledWith("pmi-1");
    expect(openTelegramLink).not.toHaveBeenCalled();
    expect(result).toBe("shared");
    vi.unstubAllGlobals();
  });

  it("falls back to a link share when the prepared message fails", async () => {
    const shareMessage = vi.fn();
    const openTelegramLink = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const platform = createTelegramPlatform({
      shareMessage,
      openTelegramLink,
    } as unknown as TelegramWebApp);

    await platform.share.recipe({ id: "r1", title: "Soup", url: "u" });

    expect(shareMessage).not.toHaveBeenCalled();
    expect(openTelegramLink).toHaveBeenCalledWith(
      expect.stringContaining("https://t.me/share/url"),
    );
    vi.unstubAllGlobals();
  });

  it("no-ops haptics and share while the SDK hasn't loaded yet", async () => {
    const platform = createTelegramPlatform(undefined);

    expect(() => {
      platform.haptics.impact("light");
      platform.haptics.notify("success");
      platform.haptics.selection();
    }).not.toThrow();
    await expect(
      platform.share.recipe({ id: "r1", title: "Soup", url: "u" }),
    ).resolves.toBe("shared");
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

  it("disables those surfaces in Telegram even before the SDK script has loaded", () => {
    // isTelegramEnvironment() is true (launch params / remembered flag) but
    // TelegramProvider's async SDK load hasn't populated webApp yet — feature
    // gating must not fall back to the web defaults during that window.
    inTelegramEnvironment.value = true;
    telegramState.webApp = undefined;

    const { result } = renderHook(
      () => ({
        linking: useFeature("accountLinking"),
        push: useFeature("pushNotifications"),
      }),
      { wrapper: PlatformProvider },
    );

    expect(result.current).toEqual({ linking: false, push: false });
  });
});
