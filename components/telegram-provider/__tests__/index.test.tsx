import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TelegramProvider, useTelegram } from "@/components/telegram-provider";
import type { TelegramWebApp } from "@/lib/telegram/webapp";

vi.mock("@/lib/auth/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: { user: { id: "u1" } }, isPending: false }),
    signInWithMiniApp: vi.fn().mockResolvedValue({ error: null }),
    getSession: vi.fn().mockResolvedValue({}),
  },
}));

type TelegramWindow = Window & {
  Telegram?: { WebApp?: Partial<TelegramWebApp> };
};

function buildWebApp(): Partial<TelegramWebApp> {
  return {
    initData: "user=1&hash=abc",
    initDataUnsafe: { user: { id: 42, first_name: "Ada" } },
    ready: vi.fn(),
    expand: vi.fn(),
    setHeaderColor: vi.fn(),
    setBackgroundColor: vi.fn(),
    disableVerticalSwipes: vi.fn(),
  };
}

function setWebApp(webApp: Partial<TelegramWebApp> | undefined): void {
  (window as TelegramWindow).Telegram = webApp ? { WebApp: webApp } : undefined;
}

function Probe() {
  const { isTelegram, user } = useTelegram();
  return (
    <div>
      <span data-testid="is-telegram">{String(isTelegram)}</span>
      <span data-testid="user-id">{user?.id ?? "none"}</span>
    </div>
  );
}

afterEach(() => {
  setWebApp(undefined);
  document.documentElement.classList.remove("telegram");
  window.location.hash = "";
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("TelegramProvider", () => {
  it("stays inert outside Telegram", () => {
    setWebApp(undefined);

    render(
      <TelegramProvider>
        <Probe />
      </TelegramProvider>,
    );

    expect(screen.getByTestId("is-telegram").textContent).toBe("false");
    expect(document.documentElement.classList.contains("telegram")).toBe(false);
  });

  it("initializes the WebApp and exposes the user when launched in Telegram", async () => {
    const webApp = buildWebApp();
    setWebApp(webApp);

    render(
      <TelegramProvider>
        <Probe />
      </TelegramProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("is-telegram").textContent).toBe("true"),
    );
    expect(screen.getByTestId("user-id").textContent).toBe("42");
    expect(webApp.ready).toHaveBeenCalledOnce();
    expect(webApp.expand).toHaveBeenCalledOnce();
    expect(webApp.disableVerticalSwipes).toHaveBeenCalledOnce();
    expect(webApp.setHeaderColor).toHaveBeenCalledWith("#0a0a0a");
    expect(document.documentElement.classList.contains("telegram")).toBe(true);
  });

  it("retries when the WebApp object exists but initData hasn't been populated yet (deep-link race)", async () => {
    // Reproduces the reported bug: on a recipe_<id> deep link, the SDK
    // script's `load` event fired before Telegram's native layer populated
    // initData, so a single check saw an "empty" WebApp and gave up for
    // good — no account was ever auto-created and Profile spun forever.
    // isTelegramEnvironment() detects the launch from the URL hash
    // independently of the SDK object, same as a real deep link.
    vi.useFakeTimers();
    window.location.hash = "#tgWebAppData=start_param%3Drecipe_abc";

    const webApp: Partial<TelegramWebApp> = {
      initData: "",
      initDataUnsafe: {},
      ready: vi.fn(),
      expand: vi.fn(),
      setHeaderColor: vi.fn(),
      setBackgroundColor: vi.fn(),
      disableVerticalSwipes: vi.fn(),
    };
    setWebApp(webApp);

    render(
      <TelegramProvider>
        <Probe />
      </TelegramProvider>,
    );

    expect(screen.getByTestId("is-telegram").textContent).toBe("false");

    // Telegram's native layer populates initData a moment later.
    webApp.initData = "user=1&hash=abc";
    webApp.initDataUnsafe = { user: { id: 42, first_name: "Ada" } };

    await vi.advanceTimersByTimeAsync(5000);

    expect(screen.getByTestId("is-telegram").textContent).toBe("true");
    expect(screen.getByTestId("user-id").textContent).toBe("42");
  });

  it("gives up after the retry window if initData never arrives", async () => {
    vi.useFakeTimers();
    window.location.hash = "#tgWebAppData=start_param%3Drecipe_abc";

    setWebApp({
      initData: "",
      initDataUnsafe: {},
    });

    render(
      <TelegramProvider>
        <Probe />
      </TelegramProvider>,
    );

    await vi.advanceTimersByTimeAsync(10_000);

    expect(screen.getByTestId("is-telegram").textContent).toBe("false");
  });
});
