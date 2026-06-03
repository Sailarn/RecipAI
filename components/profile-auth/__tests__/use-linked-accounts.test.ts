/**
 * @vitest-environment happy-dom
 */
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listAccounts = vi.hoisted(() => vi.fn());
const listUserPasskeys = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/auth-client", () => ({
  authClient: {
    listAccounts,
    passkey: { listUserPasskeys },
  },
}));

describe("useLinkedAccounts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("does not call APIs and is not loading when hasSession is false", async () => {
    const { useLinkedAccounts } = await import("../use-linked-accounts");
    const { result } = renderHook(() => useLinkedAccounts(false));

    expect(result.current.isLoading).toBe(false);
    expect(listAccounts).not.toHaveBeenCalled();
    expect(listUserPasskeys).not.toHaveBeenCalled();
  });

  it("calls both APIs when hasSession is true", async () => {
    listAccounts.mockResolvedValue({ data: [] });
    listUserPasskeys.mockResolvedValue({ data: [] });

    const { useLinkedAccounts } = await import("../use-linked-accounts");
    renderHook(() => useLinkedAccounts(true));

    await waitFor(() => {
      expect(listAccounts).toHaveBeenCalledOnce();
      expect(listUserPasskeys).toHaveBeenCalledOnce();
    });
  });

  it("sets linkedProviders from account list", async () => {
    listAccounts.mockResolvedValue({
      data: [{ providerId: "google" }, { providerId: "email" }],
    });
    listUserPasskeys.mockResolvedValue({ data: [] });

    const { useLinkedAccounts } = await import("../use-linked-accounts");
    const { result } = renderHook(() => useLinkedAccounts(true));

    await waitFor(() => {
      expect(result.current.linkedProviders).toEqual(["google", "email"]);
    });
  });

  it("sets isLoading to false after APIs respond", async () => {
    listAccounts.mockResolvedValue({ data: [] });
    listUserPasskeys.mockResolvedValue({ data: [] });

    const { useLinkedAccounts } = await import("../use-linked-accounts");
    const { result } = renderHook(() => useLinkedAccounts(true));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("telegram detection", () => {
    it("detects telegram via 'telegram' providerId", async () => {
      listAccounts.mockResolvedValue({ data: [{ providerId: "telegram" }] });
      listUserPasskeys.mockResolvedValue({ data: [] });

      const { useLinkedAccounts } = await import("../use-linked-accounts");
      const { result } = renderHook(() => useLinkedAccounts(true));

      await waitFor(() => {
        expect(result.current.telegramLinked).toBe(true);
      });
    });

    it("detects telegram via 'telegram-oidc' providerId", async () => {
      listAccounts.mockResolvedValue({
        data: [{ providerId: "telegram-oidc" }],
      });
      listUserPasskeys.mockResolvedValue({ data: [] });

      const { useLinkedAccounts } = await import("../use-linked-accounts");
      const { result } = renderHook(() => useLinkedAccounts(true));

      await waitFor(() => {
        expect(result.current.telegramLinked).toBe(true);
      });
    });

    it("returns telegramLinked false when no telegram provider", async () => {
      listAccounts.mockResolvedValue({ data: [{ providerId: "google" }] });
      listUserPasskeys.mockResolvedValue({ data: [] });

      const { useLinkedAccounts } = await import("../use-linked-accounts");
      const { result } = renderHook(() => useLinkedAccounts(true));

      await waitFor(() => {
        expect(result.current.telegramLinked).toBe(false);
      });
    });
  });

  describe("passkey detection", () => {
    it("sets passkeyAdded true when passkeys list is non-empty", async () => {
      listAccounts.mockResolvedValue({ data: [] });
      listUserPasskeys.mockResolvedValue({ data: [{ id: "pk1" }] });

      const { useLinkedAccounts } = await import("../use-linked-accounts");
      const { result } = renderHook(() => useLinkedAccounts(true));

      await waitFor(() => {
        expect(result.current.passkeyAdded).toBe(true);
      });
    });

    it("sets passkeyAdded false when passkeys list is empty", async () => {
      listAccounts.mockResolvedValue({ data: [] });
      listUserPasskeys.mockResolvedValue({ data: [] });

      const { useLinkedAccounts } = await import("../use-linked-accounts");
      const { result } = renderHook(() => useLinkedAccounts(true));

      await waitFor(() => {
        expect(result.current.passkeyAdded).toBe(false);
      });
    });
  });
});
