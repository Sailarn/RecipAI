import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTelegramAutoSignIn } from "@/components/telegram-provider/use-auto-sign-in";
import type { TelegramWebApp } from "@/lib/telegram/webapp";

const { sessionState, signInWithMiniApp, getSession } = vi.hoisted(() => ({
  sessionState: { data: null as unknown, isPending: false },
  signInWithMiniApp: vi.fn(),
  getSession: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/auth/auth-client", () => ({
  authClient: {
    useSession: () => sessionState,
    signInWithMiniApp,
    getSession,
  },
}));

function webAppStub(): TelegramWebApp {
  return { initData: "user=1&hash=abc" } as TelegramWebApp;
}

beforeEach(() => {
  sessionState.data = null;
  sessionState.isPending = false;
  signInWithMiniApp.mockResolvedValue({ data: { user: {} }, error: null });
  getSession.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
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

  it("signs in with initData and refreshes the session on success", async () => {
    const { result } = renderHook(() => useTelegramAutoSignIn(webAppStub()));

    await waitFor(() => expect(result.current).toBe("signed-in"));
    expect(signInWithMiniApp).toHaveBeenCalledWith("user=1&hash=abc");
    expect(getSession).toHaveBeenCalledOnce();
  });

  it("reports failure and skips the refresh on an auth error", async () => {
    signInWithMiniApp.mockResolvedValue({ data: null, error: { code: "X" } });

    const { result } = renderHook(() => useTelegramAutoSignIn(webAppStub()));

    await waitFor(() => expect(result.current).toBe("failed"));
    expect(getSession).not.toHaveBeenCalled();
  });

  it("does not sign in again when already authenticated", () => {
    sessionState.data = { user: { id: "u1" } };

    const { result } = renderHook(() => useTelegramAutoSignIn(webAppStub()));

    expect(result.current).toBe("signed-in");
    expect(signInWithMiniApp).not.toHaveBeenCalled();
  });
});
