"use client";

import { useCallback, useEffect, useState } from "react";
import { useLinkedAccounts } from "@/components/profile-auth/use-linked-accounts";
import { useTelegram } from "@/components/telegram-provider";
import { authClient } from "@/lib/auth/auth-client";

const STORAGE_KEY = "telegramNotifyEnabled";

// Default ON: the pref only surfaces for Telegram-connected users, where the bot
// is the reliable completion channel (web push is dead in the Telegram WebView).
function readStoredPref(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) !== "false";
}

interface UseTelegramNotifyResult {
  // Whether to show the toggle / send the notify flag: the user has a Telegram
  // connection (Mini App, or a linked Telegram account on web).
  available: boolean;
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  // The value the parse enqueue should send: available AND enabled.
  shouldNotify: boolean;
}

export function useTelegramNotify(): UseTelegramNotifyResult {
  const { isTelegram } = useTelegram();
  const { data: session } = authClient.useSession();
  const { telegramLinked } = useLinkedAccounts(!!session);
  // Read from localStorage in an effect (never during render) to avoid an SSR
  // hydration mismatch.
  const [enabled, setEnabledState] = useState(true);

  useEffect(() => {
    setEnabledState(readStoredPref());
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
    }
  }, []);

  const available = isTelegram || telegramLinked;

  return { available, enabled, setEnabled, shouldNotify: available && enabled };
}
