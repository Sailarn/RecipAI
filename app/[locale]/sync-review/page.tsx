"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useParams } from "next/navigation";
import { defaultLocale } from "@/i18n/config";
import {
  getAllNotifications,
  resolveNotification,
} from "@/lib/db/notifications";
import type { SyncNotification } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";
import { ActionButton } from "./components/action-button";
import { ConflictedSection } from "./components/conflicted-section";
import { LocalOnlySection } from "./components/local-only-section";
import { ServerOnlySection } from "./components/server-only-section";
import { useSyncActions } from "./use-sync-actions";

export default function SyncReviewPage() {
  const navigate = useNavigate();
  const params = useParams();
  const locale = (params.locale as string) ?? defaultLocale;

  const notifications = useLiveQuery(() => getAllNotifications()) as
    | SyncNotification[]
    | undefined;

  const serverOnly = (notifications ?? []).filter(
    (notification) => notification.type === "server_only",
  );
  const localOnly = (notifications ?? []).filter(
    (notification) => notification.type === "local_only",
  );
  const conflicted = (notifications ?? []).filter(
    (notification) => notification.type === "conflicted",
  );
  const total = (notifications ?? []).length;

  const actions = useSyncActions(locale);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="pt-[max(20px,calc(env(safe-area-inset-top)+8px))] px-[14px] shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate.replace(routes.recipes.list(locale))}
              aria-label="Back"
              className="bg-transparent border-none text-[var(--fg-2)] cursor-pointer text-[20px] p-0 leading-none"
            >
              ←
            </button>
            <h1 className="font-heading text-[22px] font-extrabold text-[var(--fg-1)]">
              Sync Review
            </h1>
          </div>
          {total > 0 && (
            <ActionButton
              label="Dismiss all"
              onClick={actions.dismissAll}
              variant="ghost"
            />
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-[14px] pb-[110px]">
        {total === 0 ? (
          <div className="text-center pt-20 text-[var(--fg-2)] text-[15px]">
            <div className="text-[32px] mb-3">✓</div>
            Everything is in sync
          </div>
        ) : (
          <>
            {serverOnly.length > 0 && (
              <ServerOnlySection
                notifications={serverOnly}
                onAddAll={() => actions.addAll(serverOnly)}
                onAddToDevice={actions.addToDevice}
                onDeleteFromServer={actions.deleteFromServer}
              />
            )}
            {localOnly.length > 0 && (
              <LocalOnlySection
                notifications={localOnly}
                onUploadAll={() => actions.uploadAll(localOnly)}
                onDeleteFromDevice={actions.deleteFromDevice}
                onUploadToServer={actions.uploadToServer}
              />
            )}
            {conflicted.length > 0 && (
              <ConflictedSection
                notifications={conflicted}
                onSkip={(notif) => resolveNotification(notif.id)}
                onKeepMine={actions.keepMine}
                onTakeServerVersion={actions.addToDevice}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
