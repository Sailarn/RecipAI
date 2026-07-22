"use client";

import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { getLaunchInitData, type TelegramWebApp } from "@/lib/telegram/webapp";

export type AutoSignInStatus = "idle" | "pending" | "signed-in" | "failed";

/**
 * Silently signs the user in from Telegram `initData` the first time the Mini
 * App launches. Skips when already signed in (e.g. an existing session from a
 * prior launch). On success it refreshes the better-auth session store so
 * `useSyncOnLogin` picks up the session and reconciles — no page reload needed.
 *
 * A validation/auth failure resolves to "failed" (the caller shows a fallback);
 * only unexpected/network errors reject and reach Sentry via the global handler.
 */
export function useTelegramAutoSignIn(
  webApp: TelegramWebApp | undefined,
): AutoSignInStatus {
  const { data: session, isPending } = authClient.useSession();
  const [status, setStatus] = useState<AutoSignInStatus>("idle");
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || isPending) return;
    if (session) {
      setStatus("signed-in");
      return;
    }

    // Prefer the resolved SDK's initData, but don't wait on it: Telegram can
    // populate webApp.initData *after* the SDK script's `load` event —
    // confirmed on deep-link launches specifically (see gotchas.md) — and
    // waiting for `webApp` here left a shared-recipe deep link's account
    // never created. The launch hash carries the identical payload and is
    // available from the first paint.
    const initData = webApp?.initData || getLaunchInitData();
    if (!initData) return;

    attempted.current = true;
    setStatus("pending");
    authClient
      .signInWithMiniApp(initData)
      .then((result) => {
        if (result.error) {
          setStatus("failed");
          return;
        }
        setStatus("signed-in");
        // signInWithMiniApp hits a raw endpoint, so — unlike the built-in
        // sign-in methods — better-auth doesn't refresh the reactive useSession
        // store. Toggle the session signal so useSession refetches
        // `/get-session`; without this the new session (a first-time user
        // especially) only appears after an app reopen.
        authClient.$store.notify("$sessionSignal");
      })
      .catch((caughtError) => {
        setStatus("failed");
        throw caughtError;
      });
  }, [webApp, session, isPending]);

  return status;
}
