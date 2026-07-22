/**
 * @vitest-environment happy-dom
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useTelegram = vi.hoisted(() => vi.fn());
const useSession = vi.hoisted(() => vi.fn());
const useLinkedAccounts = vi.hoisted(() => vi.fn());

vi.mock("@/components/telegram-provider", () => ({ useTelegram }));
vi.mock("@/lib/auth/auth-client", () => ({
  authClient: { useSession },
}));
vi.mock("@/components/profile-auth/use-linked-accounts", () => ({
  useLinkedAccounts,
}));

import { useTelegramNotify } from "../use-telegram-notify";

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  useTelegram.mockReturnValue({ isTelegram: false });
  useSession.mockReturnValue({ data: null });
  useLinkedAccounts.mockReturnValue({ telegramLinked: false });
});

afterEach(() => {
  window.localStorage.clear();
});

describe("useTelegramNotify", () => {
  it("is unavailable and does not notify without a Telegram connection", () => {
    const { result } = renderHook(() => useTelegramNotify());

    expect(result.current.available).toBe(false);
    expect(result.current.shouldNotify).toBe(false);
  });

  it("is available inside the Telegram Mini App", () => {
    useTelegram.mockReturnValue({ isTelegram: true });

    const { result } = renderHook(() => useTelegramNotify());

    expect(result.current.available).toBe(true);
  });

  it("is available for a web user with a linked Telegram account", () => {
    useLinkedAccounts.mockReturnValue({ telegramLinked: true });

    const { result } = renderHook(() => useTelegramNotify());

    expect(result.current.available).toBe(true);
  });

  it("defaults to enabled and notifies when available", () => {
    useTelegram.mockReturnValue({ isTelegram: true });

    const { result } = renderHook(() => useTelegramNotify());

    expect(result.current.enabled).toBe(true);
    expect(result.current.shouldNotify).toBe(true);
  });

  it("persists a disabled preference to localStorage", () => {
    useTelegram.mockReturnValue({ isTelegram: true });

    const { result } = renderHook(() => useTelegramNotify());
    act(() => result.current.setEnabled(false));

    expect(result.current.enabled).toBe(false);
    expect(result.current.shouldNotify).toBe(false);
    expect(window.localStorage.getItem("telegramNotifyEnabled")).toBe("false");
  });

  it("reads a previously disabled preference on mount", () => {
    window.localStorage.setItem("telegramNotifyEnabled", "false");
    useTelegram.mockReturnValue({ isTelegram: true });

    const { result } = renderHook(() => useTelegramNotify());

    expect(result.current.enabled).toBe(false);
    expect(result.current.shouldNotify).toBe(false);
  });
});
