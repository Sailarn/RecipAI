"use client";

import { Bell, BellOff, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { TogglePill } from "@/components/toggle-pill";
import { useTelegramNotify } from "@/lib/hooks/use-telegram-notify";
import {
  ROW_CLASSES,
  ROW_ICON_CLASSES,
  ROW_ICON_SIZE,
  ROW_ICON_STROKE_WIDTH,
  ROW_LABEL_CLASSES,
} from "../../constants";
import { RowDivider } from "../row-divider";

export function TelegramNotifyToggle() {
  const t = useTranslations("profile");
  const { available, enabled, setEnabled } = useTelegramNotify();

  // Only meaningful for Telegram-connected users; hidden for everyone else.
  if (!available) return null;

  return (
    <>
      <RowDivider />
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => setEnabled(!enabled)}
        className={`${ROW_CLASSES} cursor-pointer [-webkit-tap-highlight-color:transparent]`}
      >
        <Send
          size={ROW_ICON_SIZE}
          strokeWidth={ROW_ICON_STROKE_WIDTH}
          className={ROW_ICON_CLASSES}
        />
        <span className={ROW_LABEL_CLASSES}>{t("telegramNotifications")}</span>
        <TogglePill checked={enabled} offIcon={BellOff} onIcon={Bell} />
      </button>
    </>
  );
}
