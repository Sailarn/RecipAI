"use client";

import { Bell } from "lucide-react";
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
          <span
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${pushEnabled ? "bg-[var(--action-primary)]" : "bg-[var(--fg-3)]"}`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${pushEnabled ? "translate-x-4" : "translate-x-0"}`}
            />
          </span>
        </button>
      )}
    </>
  );
}
