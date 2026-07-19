import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getTelegramWebApp,
  isTelegramEnvironment,
  loadTelegramSdk,
  type TelegramWebApp,
} from "@/lib/telegram/webapp";

type TelegramWindow = Window & {
  Telegram?: { WebApp?: Partial<TelegramWebApp> };
};

function setWebApp(webApp: Partial<TelegramWebApp> | undefined): void {
  (window as TelegramWindow).Telegram = webApp ? { WebApp: webApp } : undefined;
}

afterEach(() => {
  setWebApp(undefined);
  window.location.hash = "";
  for (const script of document.head.querySelectorAll("script")) {
    script.remove();
  }
  vi.restoreAllMocks();
});

describe("getTelegramWebApp", () => {
  it("returns undefined when the SDK is absent", () => {
    setWebApp(undefined);

    expect(getTelegramWebApp()).toBeUndefined();
  });

  it("returns undefined when initData is empty (plain browser tab)", () => {
    setWebApp({ initData: "" });

    expect(getTelegramWebApp()).toBeUndefined();
  });

  it("returns the instance when launched with initData", () => {
    const webApp = { initData: "user=1&hash=abc" };
    setWebApp(webApp);

    expect(getTelegramWebApp()).toBe(webApp);
  });
});

describe("isTelegramEnvironment", () => {
  it("is false in a plain browser", () => {
    setWebApp(undefined);
    window.location.hash = "";

    expect(isTelegramEnvironment()).toBe(false);
  });

  it("is true when the SDK reports initData", () => {
    setWebApp({ initData: "user=1&hash=abc" });

    expect(isTelegramEnvironment()).toBe(true);
  });

  it("is true from the launch hash before the SDK loads", () => {
    setWebApp(undefined);
    window.location.hash = "#tgWebAppData=user%3D1&tgWebAppVersion=8.0";

    expect(isTelegramEnvironment()).toBe(true);
  });
});

describe("loadTelegramSdk", () => {
  it("resolves immediately when the SDK is already present", async () => {
    const webApp = { initData: "user=1&hash=abc" };
    setWebApp(webApp);

    await expect(loadTelegramSdk()).resolves.toBe(webApp);
  });

  it("injects the script once and resolves on load", async () => {
    setWebApp(undefined);
    const script = document.createElement("script");
    vi.spyOn(document, "createElement").mockReturnValue(script);
    // Skip the real append so happy-dom does not fetch the (unresolvable) src.
    const appendSpy = vi
      .spyOn(document.head, "appendChild")
      .mockImplementation((node) => node);

    const promise = loadTelegramSdk();
    expect(appendSpy).toHaveBeenCalledWith(script);
    expect(script.src).toContain("telegram-web-app.js");

    setWebApp({ initData: "user=1&hash=abc" });
    script.dispatchEvent(new Event("load"));

    await expect(promise).resolves.toBeDefined();
  });
});
