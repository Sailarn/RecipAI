import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getLaunchInitData,
  getLaunchStartParam,
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
  sessionStorage.clear();
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

  it("stays true after a reload that drops the launch hash", () => {
    setWebApp(undefined);
    window.location.hash = "#tgWebAppData=user%3D1";
    expect(isTelegramEnvironment()).toBe(true); // remembers for the session

    window.location.hash = "";
    expect(isTelegramEnvironment()).toBe(true); // still detected from the flag
  });
});

describe("getLaunchStartParam", () => {
  it("reads start_param from the live SDK when loaded", () => {
    setWebApp({
      initData: "user=1&hash=abc",
      initDataUnsafe: { start_param: "recipe_abc" },
    } as Partial<TelegramWebApp>);

    expect(getLaunchStartParam()).toBe("recipe_abc");
  });

  it("parses start_param from the launch hash before the SDK loads", () => {
    setWebApp(undefined);
    const initData = encodeURIComponent(
      "auth_date=1&start_param=recipe_xyz&hash=abc",
    );
    window.location.hash = `#tgWebAppData=${initData}&tgWebAppVersion=8.0`;

    expect(getLaunchStartParam()).toBe("recipe_xyz");
  });

  it("returns undefined when there is no launch data", () => {
    setWebApp(undefined);
    window.location.hash = "";

    expect(getLaunchStartParam()).toBeUndefined();
  });

  it("returns undefined when the hash carries no start_param", () => {
    setWebApp(undefined);
    window.location.hash = `#tgWebAppData=${encodeURIComponent("auth_date=1&hash=abc")}`;

    expect(getLaunchStartParam()).toBeUndefined();
  });
});

describe("getLaunchInitData", () => {
  it("reads initData from the live SDK when loaded", () => {
    setWebApp({ initData: "user=1&hash=abc" });

    expect(getLaunchInitData()).toBe("user=1&hash=abc");
  });

  it("falls back to the launch hash when the SDK hasn't populated initData yet", () => {
    // Reproduces the reported bug: the WebApp object can exist with an empty
    // initData for a while after the SDK script loads (deep-link launches
    // specifically — see gotchas.md). getLaunchInitData must not depend on
    // the SDK resolving at all — it reads the identical payload straight off
    // the URL, available from the very first paint.
    setWebApp({ initData: "" });
    const raw = "auth_date=1&start_param=recipe_xyz&hash=abc";
    window.location.hash = `#tgWebAppData=${encodeURIComponent(raw)}&tgWebAppVersion=8.0`;

    expect(getLaunchInitData()).toBe(raw);
  });

  it("returns undefined when there is no launch data at all", () => {
    setWebApp(undefined);
    window.location.hash = "";

    expect(getLaunchInitData()).toBeUndefined();
  });

  it("returns the remembered payload after an in-app navigation drops the hash", () => {
    // Reproduces the shared-recipe deep-link bug: TelegramDeepLink reads the
    // launch hash and pushes the recipe view (history.pushState), wiping
    // `#tgWebAppData` from the URL before the silent sign-in reads initData —
    // and on private-chat launches the SDK webApp never resolves to fall back
    // on. The payload must survive that wipe for the tab session.
    setWebApp(undefined);
    const raw = "auth_date=1&start_param=recipe_xyz&hash=abc";
    window.location.hash = `#tgWebAppData=${encodeURIComponent(raw)}&tgWebAppVersion=8.0`;

    expect(getLaunchInitData()).toBe(raw); // seen while the hash is intact

    window.location.hash = ""; // navigation rewrote the URL

    expect(getLaunchInitData()).toBe(raw); // still available from memory
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
