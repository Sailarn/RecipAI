"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "sonner";
import { db } from "@/lib/db/db";
import { captureError, trackEvent } from "@/lib/telemetry";

/** Past this, the user is staring at skeletons long enough to call it broken
 *  — even though the open does eventually succeed. */
const SLOW_OPEN_MS = 3000;

/** The DOMException/Dexie error *name* — `QuotaExceededError`,
 *  `UnknownError` (Safari private mode), `DatabaseClosedError` — which is the
 *  useful classifier. Messages are skipped: they add nothing to grouping and
 *  can carry user data. */
function failureReason(caughtError: unknown): string {
  return caughtError instanceof Error ? caughtError.name : "unknown";
}

/**
 * Surfaces the three ways IndexedDB can leave the app dead in the water.
 *
 * All of them used to be silent: every read goes through Dexie, so a database
 * that never opens (Safari private mode, storage blocked by policy) or one
 * that gets closed underneath us just left skeletons on screen forever with no
 * explanation and nothing in Sentry.
 */
export function useDatabaseLifecycle() {
  const t = useTranslations("common");

  useEffect(() => {
    // Another tab opened a newer schema version. Dexie closes this connection
    // when that happens, after which every query on this page fails — so the
    // page has to reload to be usable at all.
    const onVersionChange = () => {
      db.close();
      trackEvent("db_closed_by_other_tab");
      toast.warning(t("storageUpgraded"), {
        duration: Number.POSITIVE_INFINITY,
        action: { label: t("reload"), onClick: () => window.location.reload() },
      });
    };

    // This tab is holding an old version open while another tab waits to
    // upgrade. Nothing breaks here, but the other tab is stuck until we go.
    const onBlocked = () => {
      trackEvent("db_upgrade_blocked");
      toast.warning(t("storageBlocked"));
    };

    db.on("versionchange", onVersionChange);
    db.on("blocked", onBlocked);

    // Sentry already learns about a failed open, but only as an error — with
    // no way to line it up against what the user was doing. These events put
    // storage health in the same timeline as the rest of the session, which is
    // what "recipes just don't load for this one user" needs.
    const openStartedAt = Date.now();
    db.open()
      .then(() => {
        const durationMs = Date.now() - openStartedAt;
        if (durationMs >= SLOW_OPEN_MS) {
          trackEvent("db_open_slow", { duration_ms: durationMs });
        }
      })
      .catch((caughtError) => {
        trackEvent("db_open_failed", { reason: failureReason(caughtError) });
        captureError(caughtError, { tags: { source: "dexie-open" } });
        toast.error(t("storageUnavailable"), {
          duration: Number.POSITIVE_INFINITY,
        });
      });

    return () => {
      db.on("versionchange").unsubscribe(onVersionChange);
      db.on("blocked").unsubscribe(onBlocked);
    };
  }, [t]);
}
