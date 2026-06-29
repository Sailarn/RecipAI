"use client";

import { useCallback, useEffect, useState } from "react";
import { announceIfMaintenance } from "@/lib/api/api-fetch";
import { api } from "@/lib/routes";
import { trackEvent } from "@/lib/telemetry";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

export type PushPermissionState = "default" | "granted" | "denied";

interface UsePushSubscriptionResult {
  isSupported: boolean;
  isPending: boolean;
  permission: PushPermissionState;
  subscription: PushSubscription | null;
  subscribe: () => Promise<PushSubscription | null>;
  unsubscribe: () => Promise<void>;
}

// Web Push needs all of: a secure context (HTTPS or localhost), the three
// browser APIs, and a configured VAPID key. Checked lazily (not at module load)
// so it stays correct under SSR, where `window` is absent.
function hasPushApis(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    VAPID_PUBLIC_KEY !== ""
  );
}

export function usePushSubscription(): UsePushSubscriptionResult {
  // `isSupported` starts false and is flipped on only once we confirm a *ready*
  // service worker — not just that the APIs exist. The SW is only registered in
  // production builds (Turbopack dev ships none), so gating on `ready` keeps the
  // toggle hidden in dev where subscribing would hang forever. Resolving this in
  // an effect (never during render) also avoids an SSR hydration mismatch.
  const [isSupported, setIsSupported] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [permission, setPermission] = useState<PushPermissionState>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );

  useEffect(() => {
    if (!hasPushApis()) return;

    let cancelled = false;
    navigator.serviceWorker.ready.then((registration) => {
      if (cancelled) return;
      setIsSupported(true);
      setPermission(Notification.permission as PushPermissionState);
      registration.pushManager.getSubscription().then((sub) => {
        if (!cancelled) setSubscription(sub);
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(async (): Promise<PushSubscription | null> => {
    if (!hasPushApis()) return null;

    setIsPending(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          VAPID_PUBLIC_KEY,
        ) as unknown as ArrayBuffer,
      });

      const json = sub.toJSON();
      const response = await fetch(api.pushSubscribe, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        }),
      });
      if (!response.ok) {
        // The browser is now subscribed but the server never stored it — roll
        // the browser sub back so browser, server, and UI stay consistent.
        await sub.unsubscribe().catch(() => {});
        if (await announceIfMaintenance(response)) return null;
        throw new Error(`Push subscribe request failed: ${response.status}`);
      }

      // Only flip UI + telemetry once the server has actually persisted it.
      setSubscription(sub);
      setPermission("granted");
      trackEvent("push_subscribed", undefined);
      return sub;
    } catch (error) {
      // A blocked permission prompt is an expected user outcome, not an error.
      if (error instanceof Error && error.name === "NotAllowedError") {
        setPermission("denied");
        return null;
      }
      // Re-throw real failures so Sentry's global handler captures them.
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!subscription) return;

    setIsPending(true);
    try {
      // Confirm the server removed it *before* tearing down the browser sub, so
      // a failed DELETE leaves the toggle enabled and retryable.
      const response = await fetch(api.pushSubscribe, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      if (!response.ok) {
        if (await announceIfMaintenance(response)) return;
        throw new Error(`Push unsubscribe request failed: ${response.status}`);
      }

      await subscription.unsubscribe();
      setSubscription(null);
      trackEvent("push_unsubscribed", undefined);
    } finally {
      setIsPending(false);
    }
  }, [subscription]);

  return {
    isSupported,
    isPending,
    permission,
    subscription,
    subscribe,
    unsubscribe,
  };
}
