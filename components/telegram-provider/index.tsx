"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  getTelegramWebApp,
  isTelegramEnvironment,
  loadTelegramSdk,
  type TelegramUser,
  type TelegramWebApp,
} from "@/lib/telegram/webapp";
import { trackEvent } from "@/lib/telemetry";
import {
  type AutoSignInStatus,
  useTelegramAutoSignIn,
} from "./use-auto-sign-in";

type TelegramContextValue = {
  isTelegram: boolean;
  webApp: TelegramWebApp | undefined;
  user: TelegramUser | undefined;
  authStatus: AutoSignInStatus;
};

const TelegramContext = createContext<TelegramContextValue>({
  isTelegram: false,
  webApp: undefined,
  user: undefined,
  authStatus: "idle",
});

// The app's fixed dark background. Matching Telegram's own chrome to this
// avoids a white header/background flash on launch (the app keeps its own
// amber/dark theme rather than adopting themeParams — see the spec, D2).
const APP_BACKGROUND = "#0a0a0a";

// Service workers are unreliable inside the Telegram WebView (iOS especially),
// and a stale Serwist cache would serve an outdated shell. Best-effort removal;
// Dexie/IndexedDB is unaffected and remains the local data store.
function unregisterServiceWorkers(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      void registration.unregister();
    }
  });
}

function initializeWebApp(webApp: TelegramWebApp): void {
  webApp.ready();
  webApp.expand();
  webApp.setHeaderColor?.(APP_BACKGROUND);
  webApp.setBackgroundColor?.(APP_BACKGROUND);
  // Stop a downward scroll from being read as swipe-to-close.
  webApp.disableVerticalSwipes?.();
  document.documentElement.classList.add("telegram");
  unregisterServiceWorkers();
  trackEvent("telegram_mini_app_launched", {
    hasStartParam: Boolean(webApp.initDataUnsafe.start_param),
  });
}

type TelegramState = {
  isTelegram: boolean;
  webApp: TelegramWebApp | undefined;
  user: TelegramUser | undefined;
};

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TelegramState>({
    isTelegram: false,
    webApp: undefined,
    user: undefined,
  });

  useEffect(() => {
    if (!isTelegramEnvironment()) return;

    let cancelled = false;
    loadTelegramSdk().then((webApp) => {
      const resolved = webApp ?? getTelegramWebApp();
      if (cancelled || !resolved) return;
      initializeWebApp(resolved);
      setState({
        isTelegram: true,
        webApp: resolved,
        user: resolved.initDataUnsafe.user,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const authStatus = useTelegramAutoSignIn(state.webApp);

  return (
    <TelegramContext.Provider value={{ ...state, authStatus }}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram(): TelegramContextValue {
  return useContext(TelegramContext);
}

export function useIsTelegram(): boolean {
  return useContext(TelegramContext).isTelegram;
}
