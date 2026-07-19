"use client";

import { Bell, BellOff } from "lucide-react";
import { useIsTelegram } from "@/components/telegram-provider";
import { TogglePill } from "@/components/toggle-pill";
import { usePushSubscription } from "@/lib/hooks/use-push-subscription";
import {
  ROW_CLASSES,
  ROW_ICON_CLASSES,
  ROW_ICON_SIZE,
  ROW_ICON_STROKE_WIDTH,
  ROW_LABEL_CLASSES,
} from "../../constants";
import { RowDivider } from "../row-divider";

export function PushNotificationToggle() {
  const push = usePushSubscription();
  const isTelegram = useIsTelegram();

  // Inside Telegram web push is unavailable and service workers are
  // unregistered; parse-complete alerts arrive via the bot chat instead.
  if (isTelegram) return null;

  // Hidden wherever push can't actually run (insecure context, no service
  // worker, or a platform that doesn't support it — e.g. iOS Safari tabs).
  if (!push.isSupported) return null;

  const pushEnabled = push.subscription !== null;

  return (
    <>
      <RowDivider />
      {push.permission === "denied" ? (
        <div className={`${ROW_CLASSES} cursor-default`}>
          <Bell
            size={ROW_ICON_SIZE}
            strokeWidth={ROW_ICON_STROKE_WIDTH}
            className={ROW_ICON_CLASSES}
          />
          <span className={ROW_LABEL_CLASSES}>Push notifications</span>
          <span className="text-xs text-[var(--fg-3)]">Enable in Settings</span>
        </div>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={pushEnabled}
          aria-busy={push.isPending}
          disabled={push.isPending}
          onClick={pushEnabled ? push.unsubscribe : push.subscribe}
          className={`${ROW_CLASSES} cursor-pointer [-webkit-tap-highlight-color:transparent] disabled:opacity-60`}
        >
          <Bell
            size={ROW_ICON_SIZE}
            strokeWidth={ROW_ICON_STROKE_WIDTH}
            className={ROW_ICON_CLASSES}
          />
          <span className={ROW_LABEL_CLASSES}>Push notifications</span>
          <TogglePill checked={pushEnabled} offIcon={BellOff} onIcon={Bell} />
        </button>
      )}
    </>
  );
}
