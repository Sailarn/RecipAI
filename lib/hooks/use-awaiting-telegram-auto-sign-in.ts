"use client";

import { useTelegram } from "@/components/telegram-provider";
import { isTelegramEnvironment } from "@/lib/telegram/webapp";

/**
 * True while inside Telegram and the silent auto sign-in (see
 * useTelegramAutoSignIn) hasn't settled yet. Callers that branch on "signed
 * in" must hold their loading state during this window instead of treating
 * the not-yet-resolved session as signed-out — the window is real (an async
 * initData exchange) but brief.
 */
export function useAwaitingTelegramAutoSignIn(hasSession: boolean): boolean {
  const { authStatus } = useTelegram();
  return (
    isTelegramEnvironment() &&
    !hasSession &&
    (authStatus === "idle" || authStatus === "pending")
  );
}
