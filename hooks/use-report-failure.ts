"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";

/**
 * Tell the user a mutation failed, then re-throw.
 *
 * The re-throw is the point: it keeps the real error reaching Sentry's global
 * `unhandledrejection` handler, which is this project's standard for reporting
 * client errors (see CLAUDE.md). Swallowing here would leave a Dexie write
 * failure completely invisible — the UI simply wouldn't change.
 *
 * Use as `.catch(reportFailure)` on any fire-and-forget mutation.
 */
export function useReportFailure() {
  const t = useTranslations("common");

  return useCallback(
    (caughtError: unknown): never => {
      toast.error(t("error"));
      throw caughtError;
    },
    [t],
  );
}
