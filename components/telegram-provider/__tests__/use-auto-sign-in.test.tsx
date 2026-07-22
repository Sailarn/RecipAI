import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTelegramAutoSignIn } from "@/components/telegram-provider/use-auto-sign-in";
import { getLaunchInitData, type TelegramWebApp } from "@/lib/telegram/webapp";

const { sessionState, signInWithMiniApp, notify } = vi.hoisted(() => ({
  sessionState: { data: null as unknown, isPending: false },
  signInWithMiniApp: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("@/lib/auth/auth-client", () => ({
  authClient: {
    useSession: () => sessionState,
    signInWithMiniApp,
    $store: { notify },
  },
}));

function webAppStub(): TelegramWebApp {
  return { initData: "user=1&hash=abc" } as TelegramWebApp;
}

beforeEach(() => {
  sessionState.data = null;
  sessionState.isPending = false;
  signInWithMiniApp.mockResolvedValue({ data: { user: {} }, error: null });
  notify.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
  window.location.hash = "";
  sessionStorage.clear();
});

describe("useTelegramAutoSignIn", () => {
  it("stays idle without a WebApp", () => {
    const { result } = renderHook(() => useTelegramAutoSignIn(undefined));

    expect(result.current).toBe("idle");
    expect(signInWithMiniApp).not.toHaveBeenCalled();
  });

  it("waits while the session check is pending", () => {
    sessionState.isPending = true;

    const { result } = renderHook(() => useTelegramAutoSignIn(webAppStub()));

    expect(result.current).toBe("idle");
    expect(signInWithMiniApp).not.toHaveBeenCalled();
  });

  it("signs in with initData and refreshes the session store on success", async () => {
    const { result } = renderHook(() => useTelegramAutoSignIn(webAppStub()));

    await waitFor(() => expect(result.current).toBe("signed-in"));
    expect(signInWithMiniApp).toHaveBeenCalledWith("user=1&hash=abc");
    expect(notify).toHaveBeenCalledWith("$sessionSignal");
  });

  it("reports failure and skips the refresh on an auth error", async () => {
    signInWithMiniApp.mockResolvedValue({ data: null, error: { code: "X" } });

    const { result } = renderHook(() => useTelegramAutoSignIn(webAppStub()));

    await waitFor(() => expect(result.current).toBe("failed"));
    expect(notify).not.toHaveBeenCalled();
  });

  it("does not sign in again when already authenticated", () => {
    sessionState.data = { user: { id: "u1" } };

    const { result } = renderHook(() => useTelegramAutoSignIn(webAppStub()));

    expect(result.current).toBe("signed-in");
    expect(signInWithMiniApp).not.toHaveBeenCalled();
  });

  it("signs in from the launch hash when no WebApp has resolved yet (deep-link account creation)", async () => {
    // The bug this covers: a shared-recipe deep link never got an account
    // created because the hook previously required a resolved WebApp object
    // before attempting sign-in at all — see gotchas.md. The launch hash
    // carries the identical initData payload and is available immediately.
    window.location.hash =
      "#tgWebAppData=user%3D1%26hash%3Dabc%26start_param%3Drecipe_x";

    const { result } = renderHook(() => useTelegramAutoSignIn(undefined));

    await waitFor(() => expect(result.current).toBe("signed-in"));
    expect(signInWithMiniApp).toHaveBeenCalledWith(
      "user=1&hash=abc&start_param=recipe_x",
    );
  });

  it("still signs in after a deep-link navigation has dropped the launch hash", async () => {
    // The shared-recipe bug: TelegramDeepLink pushes the recipe view and wipes
    // `#tgWebAppData` before this hook (which had waited on the session check)
    // reads initData — with no resolved WebApp to fall back on, the account was
    // never created and Profile spun forever. The remembered launch payload
    // must keep the sign-in working past the wipe.
    window.location.hash =
      "#tgWebAppData=user%3D1%26hash%3Dabc%26start_param%3Drecipe_x";
    getLaunchInitData(); // deep link reads the hash first, seeding the memory
    window.location.hash = ""; // then its push rewrites the URL

    const { result } = renderHook(() => useTelegramAutoSignIn(undefined));

    await waitFor(() => expect(result.current).toBe("signed-in"));
    expect(signInWithMiniApp).toHaveBeenCalledWith(
      "user=1&hash=abc&start_param=recipe_x",
    );
  });
});
