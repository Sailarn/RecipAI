"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { CLOUD_PREF_KEYS, getCloudItem } from "@/lib/telegram/cloud-storage";
import {
  getTelegramWebApp,
  isTelegramEnvironment,
  loadTelegramSdk,
  type TelegramUser,
  type TelegramWebApp,
} from "@/lib/telegram/webapp";
import { trackEvent } from "@/lib/telemetry";
import { THEME } from "@/lib/theme";
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

// Restore the theme the user last chose. The pre-paint script reads it from
// localStorage, but Telegram clears that between sessions — so on reopen the
// class is back to the default until CloudStorage (which persists) restores it.
// Async, so a brief default-theme flash is possible before this applies.
async function restoreThemeFromCloud(): Promise<void> {
  const theme = await getCloudItem(CLOUD_PREF_KEYS.theme);
  if (theme !== THEME.DARK && theme !== THEME.LIGHT) return;
  const root = document.documentElement;
  root.classList.toggle(THEME.DARK, theme === THEME.DARK);
  root.classList.toggle(THEME.LIGHT, theme === THEME.LIGHT);
  // Re-seed the fast path so it wins pre-paint on the next reopen if it survives.
  try {
    localStorage.setItem("theme", theme);
  } catch {}
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

// The SDK script's `load` event can fire before Telegram's native layer has
// actually populated `initData` on the WebApp object — observed reliably on
// deep-link launches (a `recipe_<id>` startapp param opened from a shared
// link): the object exists but getTelegramWebApp() rejects it as empty, so a
// single check gives up permanently — no account gets auto-created and
// Profile spins forever, even though the URL-hash-based launch detection
// (isTelegramEnvironment) already knows we're in Telegram. Poll briefly
// instead of trusting the first check.
const WEBAPP_POLL_INTERVAL_MS = 200;
const WEBAPP_POLL_MAX_ATTEMPTS = 25; // ~5s total

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TelegramState>({
    isTelegram: false,
    webApp: undefined,
    user: undefined,
  });

  useEffect(() => {
    if (!isTelegramEnvironment()) return;

    let cancelled = false;
    let pollTimer: number | undefined;

    function settle(resolved: TelegramWebApp): void {
      if (cancelled) return;
      initializeWebApp(resolved);
      void restoreThemeFromCloud();
      setState({
        isTelegram: true,
        webApp: resolved,
        user: resolved.initDataUnsafe.user,
      });
    }

    function pollForWebApp(attempt: number): void {
      if (cancelled) return;
      const resolved = getTelegramWebApp();
      if (resolved) {
        settle(resolved);
        return;
      }
      if (attempt >= WEBAPP_POLL_MAX_ATTEMPTS) return;
      pollTimer = window.setTimeout(
        () => pollForWebApp(attempt + 1),
        WEBAPP_POLL_INTERVAL_MS,
      );
    }

    loadTelegramSdk().then((webApp) => {
      const resolved = webApp ?? getTelegramWebApp();
      if (cancelled) return;
      if (resolved) {
        settle(resolved);
        return;
      }
      pollForWebApp(0);
    });

    return () => {
      cancelled = true;
      if (pollTimer !== undefined) window.clearTimeout(pollTimer);
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
