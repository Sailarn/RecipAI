"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "sonner";
import { db } from "@/lib/db/db";
import { captureError } from "@/lib/telemetry";

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
      toast.warning(t("storageUpgraded"), {
        duration: Number.POSITIVE_INFINITY,
        action: { label: t("reload"), onClick: () => window.location.reload() },
      });
    };

    // This tab is holding an old version open while another tab waits to
    // upgrade. Nothing breaks here, but the other tab is stuck until we go.
    const onBlocked = () => {
      toast.warning(t("storageBlocked"));
    };

    db.on("versionchange", onVersionChange);
    db.on("blocked", onBlocked);

    db.open().catch((caughtError) => {
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
