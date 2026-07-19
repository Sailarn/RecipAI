"use client";

import { useEffect, useRef } from "react";
import { useTelegram } from "@/components/telegram-provider";
import { useNavigationStack } from "@/lib/navigation-stack";
import { useNavigate } from "@/lib/transitions";

/**
 * Drives Telegram's native BackButton from the app's navigation stack: it
 * appears whenever a view is pushed over the root and pops that view when
 * tapped. Renders nothing — Telegram owns the chrome. No-op outside Telegram.
 */
export function TelegramBackButton() {
  const { webApp } = useTelegram();
  const { canPop } = useNavigationStack();
  const navigate = useNavigate();

  // useNavigate() returns a fresh object each render; keep the effect stable by
  // reading the latest back() through a ref instead of depending on it.
  const backRef = useRef(navigate.back);
  backRef.current = navigate.back;

  useEffect(() => {
    if (!webApp) return;
    const backButton = webApp.BackButton;
    const handleClick = () => backRef.current();

    if (canPop) {
      backButton.onClick(handleClick);
      backButton.show();
    } else {
      backButton.hide();
    }

    return () => backButton.offClick(handleClick);
  }, [webApp, canPop]);

  return null;
}
