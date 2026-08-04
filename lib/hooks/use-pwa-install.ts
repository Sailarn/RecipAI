"use client";

import { useCallback, useEffect, useState } from "react";
import { trackEvent } from "@/lib/telemetry";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Non-standard properties the platform checks below rely on: `standalone` is
// WebKit-only (how iOS reports an installed home-screen app) and `MSStream`
// exists solely to exclude old IE from the iPad/iPhone user-agent test.
interface WebKitNavigator extends Navigator {
  standalone?: boolean;
}

interface LegacyIEWindow extends Window {
  MSStream?: unknown;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as WebKitNavigator).standalone === true;
    setIsInstalled(standalone);

    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window as LegacyIEWindow).MSStream,
    );

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      trackEvent("pwa_installed", undefined);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
    return true;
  }, [deferredPrompt]);

  const showInstallOption = !isInstalled && (deferredPrompt !== null || isIOS);

  return { isInstalled, showInstallOption, install, isIOS };
}
