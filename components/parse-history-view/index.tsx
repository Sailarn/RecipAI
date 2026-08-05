"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch, isMaintenanceError } from "@/lib/api/api-fetch";
import { getParseHistory } from "@/lib/db/parse-history";
import type { ParseHistoryEntry } from "@/lib/db/schema";
import { addJobId } from "@/lib/parse-job-storage";
import { api } from "@/lib/routes";
import { trackEvent } from "@/lib/telemetry";
import { useNavigate } from "@/lib/transitions";
import { ParseHistoryRow } from "./entry-row";

export function ParseHistoryView() {
  const tParse = useTranslations("parse");
  const navigate = useNavigate();
  const entries = useLiveQuery(() => getParseHistory(), []);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    trackEvent("parse_history_viewed", undefined);
  }, []);

  const retryImport = async (entry: ParseHistoryEntry) => {
    if (!entry.url || retryingIds.has(entry.id)) return;

    setRetryingIds((current) => new Set(current).add(entry.id));
    try {
      const enqueueResponse = await apiFetch(api.parseQueue, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: entry.url }),
      });
      if (!enqueueResponse.ok) throw new Error("Failed to retry import");

      const { jobId, uploadToken } = await enqueueResponse.json();
      addJobId(jobId, uploadToken);
      window.dispatchEvent(
        new CustomEvent("parse-job-created", { detail: { jobId } }),
      );

      const processResponse = await apiFetch(api.parseQueueProcess, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (!processResponse.ok) throw new Error("Failed to process retry");
    } catch (error) {
      if (!isMaintenanceError(error)) {
        toast.error(tParse("retryFailed"));
      }
    } finally {
      setRetryingIds((current) => {
        const next = new Set(current);
        next.delete(entry.id);
        return next;
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-base)] overflow-hidden">
      <header className="shrink-0 pt-[max(20px,calc(env(safe-area-inset-top)+8px))] px-4 pb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate.back()}
          aria-label="Back"
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-[var(--glass-card-bg)] border border-[var(--glass-card-border)] text-[var(--fg-1)] cursor-pointer"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="font-heading text-[22px] font-extrabold text-[var(--fg-1)]">
          Import history
        </h1>
      </header>

      {entries !== undefined && entries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <p className="font-medium text-[var(--fg-2)]">
            {tParse("noImports")}
          </p>
          <p className="mt-1 text-sm text-[var(--fg-3)]">
            {tParse("noImportsHint")}
          </p>
        </div>
      ) : (
        <ul className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-[100px] space-y-3">
          {entries?.map((entry) => (
            <ParseHistoryRow
              key={entry.id}
              entry={entry}
              isRetrying={retryingIds.has(entry.id)}
              onRetry={retryImport}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
