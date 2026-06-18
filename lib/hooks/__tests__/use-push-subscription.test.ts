import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  // Read at module load by the hook — must be set before the import below.
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY =
    "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8";
});

import { usePushSubscription } from "../use-push-subscription";

const fakeSubscription = {
  endpoint: "https://push.example/abc",
  toJSON: () => ({
    endpoint: "https://push.example/abc",
    keys: { p256dh: "p256dh-key", auth: "auth-key" },
  }),
  unsubscribe: vi.fn().mockResolvedValue(true),
} as unknown as PushSubscription;

interface PushEnvOptions {
  secureContext?: boolean;
  existingSubscription?: PushSubscription | null;
}

function setupPushEnv(options: PushEnvOptions = {}) {
  const { secureContext = true, existingSubscription = null } = options;

  const subscribeMock = vi.fn().mockResolvedValue(fakeSubscription);
  const getSubscriptionMock = vi.fn().mockResolvedValue(existingSubscription);
  const registration = {
    pushManager: {
      subscribe: subscribeMock,
      getSubscription: getSubscriptionMock,
    },
  };

  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    value: secureContext,
  });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { ready: Promise.resolve(registration) },
  });
  Object.defineProperty(window, "PushManager", {
    configurable: true,
    value: class {},
  });
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    value: { permission: "default" },
  });

  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);

  return { subscribeMock, getSubscriptionMock, fetchMock };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("usePushSubscription", () => {
  describe("support detection", () => {
    it("stays unsupported in an insecure context", async () => {
      setupPushEnv({ secureContext: false });

      const { result } = renderHook(() => usePushSubscription());

      await Promise.resolve();
      expect(result.current.isSupported).toBe(false);
    });

    it("becomes supported once the service worker is ready in a secure context", async () => {
      setupPushEnv();

      const { result } = renderHook(() => usePushSubscription());

      await waitFor(() => expect(result.current.isSupported).toBe(true));
      expect(result.current.permission).toBe("default");
    });

    it("reflects an existing subscription on mount", async () => {
      setupPushEnv({ existingSubscription: fakeSubscription });

      const { result } = renderHook(() => usePushSubscription());

      await waitFor(() =>
        expect(result.current.subscription).toBe(fakeSubscription),
      );
    });
  });

  describe("subscribe", () => {
    it("subscribes and posts the subscription to the server", async () => {
      const { subscribeMock, fetchMock } = setupPushEnv();
      const { result } = renderHook(() => usePushSubscription());
      await waitFor(() => expect(result.current.isSupported).toBe(true));

      await act(async () => {
        await result.current.subscribe();
      });

      expect(subscribeMock).toHaveBeenCalledWith(
        expect.objectContaining({ userVisibleOnly: true }),
      );
      expect(result.current.subscription).toBe(fakeSubscription);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/push/subscribe",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("rolls back and throws when the server rejects the subscription", async () => {
      const { fetchMock } = setupPushEnv();
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
      const { result } = renderHook(() => usePushSubscription());
      await waitFor(() => expect(result.current.isSupported).toBe(true));

      await act(async () => {
        await expect(result.current.subscribe()).rejects.toThrow();
      });

      expect(fakeSubscription.unsubscribe).toHaveBeenCalledOnce();
      expect(result.current.subscription).toBeNull();
    });

    it("sets permission to denied without throwing when the user blocks", async () => {
      const { subscribeMock } = setupPushEnv();
      const notAllowed = new Error("blocked");
      notAllowed.name = "NotAllowedError";
      subscribeMock.mockRejectedValueOnce(notAllowed);
      const { result } = renderHook(() => usePushSubscription());
      await waitFor(() => expect(result.current.isSupported).toBe(true));

      let returned: PushSubscription | null = fakeSubscription;
      await act(async () => {
        returned = await result.current.subscribe();
      });

      expect(returned).toBeNull();
      expect(result.current.permission).toBe("denied");
    });

    it("clears the pending flag after subscribing", async () => {
      setupPushEnv();
      const { result } = renderHook(() => usePushSubscription());
      await waitFor(() => expect(result.current.isSupported).toBe(true));

      await act(async () => {
        await result.current.subscribe();
      });

      expect(result.current.isPending).toBe(false);
    });
  });

  describe("unsubscribe", () => {
    it("unsubscribes and deletes the subscription on the server", async () => {
      const { fetchMock } = setupPushEnv({
        existingSubscription: fakeSubscription,
      });
      const { result } = renderHook(() => usePushSubscription());
      await waitFor(() =>
        expect(result.current.subscription).toBe(fakeSubscription),
      );

      await act(async () => {
        await result.current.unsubscribe();
      });

      expect(fakeSubscription.unsubscribe).toHaveBeenCalledOnce();
      expect(result.current.subscription).toBeNull();
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/push/subscribe",
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("keeps the subscription enabled when the server rejects the delete", async () => {
      const { fetchMock } = setupPushEnv({
        existingSubscription: fakeSubscription,
      });
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
      const { result } = renderHook(() => usePushSubscription());
      await waitFor(() =>
        expect(result.current.subscription).toBe(fakeSubscription),
      );

      await act(async () => {
        await expect(result.current.unsubscribe()).rejects.toThrow();
      });

      expect(fakeSubscription.unsubscribe).not.toHaveBeenCalled();
      expect(result.current.subscription).toBe(fakeSubscription);
    });
  });
});
