"use client";

import { useCallback, useEffect, useState } from "react";
import { logger } from "@/lib/logger";
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
  permission: PushPermissionState;
  subscription: PushSubscription | null;
  subscribe: () => Promise<PushSubscription | null>;
}

export function usePushSubscription(): UsePushSubscriptionResult {
  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    VAPID_PUBLIC_KEY !== "";

  const [permission, setPermission] = useState<PushPermissionState>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );

  useEffect(() => {
    if (!isSupported) return;
    setPermission(Notification.permission as PushPermissionState);

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscription(sub);
      });
    });
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<PushSubscription | null> => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return null;

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          VAPID_PUBLIC_KEY,
        ) as unknown as ArrayBuffer,
      });

      setSubscription(sub);
      setPermission("granted");
      trackEvent("push_subscribed", undefined);

      const json = sub.toJSON();
      await fetch(api.pushSubscribe, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        }),
      });

      return sub;
    } catch (error) {
      if (error instanceof Error && error.name === "NotAllowedError") {
        setPermission("denied");
      } else {
        logger.error("Push subscription failed:", error);
      }
      return null;
    }
  }, [isSupported]);

  return { isSupported, permission, subscription, subscribe };
}
