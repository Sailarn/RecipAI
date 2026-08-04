"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { db } from "@/lib/db/db";
import { recordParseHistory } from "@/lib/db/parse-history";
import { createParsedRecipeEntry } from "@/lib/db/parsed-recipes";
import { saveParsedRecipe } from "@/lib/db/save-parsed-recipe";
import type { ParsedRecipe } from "@/lib/db/schema";
import { claimJobCompletion } from "@/lib/parse-job-completion";
import { dispatchParsedRecipeCreated } from "@/lib/parse-job-events";
import {
  getJobIds,
  getPendingUploadToken,
  getUploadToken,
  removeJobId,
  storePendingUploadToken,
} from "@/lib/parse-job-storage";
import {
  doneParseHistoryEntry,
  failedParseHistoryEntry,
} from "@/lib/parse-recipe/parse-history-entry";
import { api, routes } from "@/lib/routes";
import { captureError, trackEvent } from "@/lib/telemetry";
import { useNavigate } from "@/lib/transitions";
import { isImageKitUrl, uploadImage } from "@/lib/upload/images";

// Most parses finish within the first few polls, so start tight and back off
// from there — a job that is still running after a minute is not going to
// benefit from being asked every 3 seconds, and each poll costs a server round
// trip (and, through the proxy, a maintenance-config read).
const INITIAL_POLL_MS = 3_000;
const MAX_POLL_MS = 30_000;
const POLL_BACKOFF = 1.5;

// Network errors are expected in this app (offline is a normal state), so they
// keep retrying at a fixed interval and never count towards the deadline below.
const NETWORK_RETRY_MS = 5_000;

// A job the server still calls "processing" after this long is stuck. Give up
// rather than polling for the lifetime of the tab, and leave a history entry so
// the parse doesn't just vanish.
const MAX_WATCH_MS = 15 * 60_000;

export function useParseJobWatcher() {
  const t = useTranslations("parse");
  const navigate = useNavigate();
  // Jobs that are already being polled (or have reached a terminal state).
  // useNavigate() returns a fresh object every render, so this hook's effect
  // re-runs on every re-render and re-polls all saved job IDs. Without this
  // guard, a re-render mid-parse spawns a second concurrent poll loop for the
  // same job — both reach "done" and fire handleDone twice (two toasts + two
  // parsedRecipes rows). Job IDs are unique per parse, so once seen here a job
  // is never polled again for the lifetime of the watcher.
  const watchedJobs = useRef<Set<string>>(new Set());
  const timeouts = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const handleDone = useCallback(
    async (id: string, result: ParsedRecipe) => {
      // Read and preserve the token before removeJobId wipes it.
      const uploadToken = getUploadToken(id) ?? undefined;
      if (uploadToken) storePendingUploadToken(uploadToken);
      removeJobId(id);

      const entry = createParsedRecipeEntry(result);

      let imageUrl = entry.imageUrl;
      // The image is uploaded to ImageKit at parse time, so the result usually
      // already carries a stable URL + fileId; only re-upload if it doesn't.
      let imageFileId = result.imageFileId;

      if (imageUrl && !isImageKitUrl(imageUrl)) {
        try {
          const uploaded = await uploadImage(imageUrl, { uploadToken });
          imageUrl = uploaded.url;
          imageFileId = uploaded.fileId;
        } catch {
          // continue without image upload
        }
      }

      const updatedEntry = { ...entry, imageUrl, imageFileId };
      await db.parsedRecipes.add(updatedEntry);
      dispatchParsedRecipeCreated({ jobId: id, entryId: updatedEntry.id });

      toast(result.title, {
        description: t("parsedTapToReview"),
        duration: 10000,
        closeButton: true,
        action: {
          label: t("reviewSave"),
          onClick: async () => {
            await saveParsedRecipe(
              updatedEntry,
              getPendingUploadToken() ?? undefined,
            );
            await db.parsedRecipes.delete(updatedEntry.id);
            toast.success(t("savedShort"));
          },
        },
        cancel: {
          label: t("reviewEdit"),
          onClick: () => {
            trackEvent("parse_reviewed", undefined);
            localStorage.setItem("parsedRecipe", JSON.stringify(updatedEntry));
            db.parsedRecipes.delete(updatedEntry.id).catch(() => {});
            const locale = window.location.pathname.split("/")[1];
            navigate.push(routes.recipes.new(locale));
          },
        },
      });
    },
    [navigate, t],
  );

  const poll = useCallback(
    (id: string) => {
      if (watchedJobs.current.has(id)) return;
      watchedJobs.current.add(id);

      const scheduleRetry = (delayMs: number, run: () => void) => {
        const timer = setTimeout(() => {
          timeouts.current.delete(timer);
          run();
        }, delayMs);
        timeouts.current.add(timer);
      };

      const startedAt = Date.now();
      let pollDelay = INITIAL_POLL_MS;

      const openParseHistory = () => {
        const locale = window.location.pathname.split("/")[1];
        navigate.push(routes.parseHistory(locale));
      };

      const abandonStuckJob = (jobUrl: string | undefined) => {
        if (!claimJobCompletion(id)) return;
        removeJobId(id);
        const timeoutReason = t("timedOut");
        trackEvent("parse_failed", { source: "url", reason: timeoutReason });
        recordParseHistory(
          failedParseHistoryEntry(id, jobUrl ?? "", timeoutReason),
        ).catch(() => {});
        toast.error(timeoutReason, {
          action: { label: t("details"), onClick: openParseHistory },
        });
      };

      const run = async () => {
        try {
          const res = await fetch(api.parseQueueJob(id));
          const { status, result, error, url: jobUrl } = await res.json();

          if (status === "done") {
            // The inline parse page may have already handled this job.
            if (!claimJobCompletion(id)) return;
            const parsed = result as ParsedRecipe;
            await handleDone(id, parsed);
            trackEvent("parse_succeeded", { source: "url" });
            recordParseHistory(
              doneParseHistoryEntry(
                id,
                parsed.title,
                parsed.sourceUrl ?? jobUrl,
              ),
            ).catch(() => {});
          } else if (status === "failed") {
            if (!claimJobCompletion(id)) return;
            const rawError: string = error || t("failedGeneric");
            removeJobId(id);
            trackEvent("parse_failed", { source: "url", reason: rawError });
            recordParseHistory(
              failedParseHistoryEntry(id, jobUrl, rawError),
            ).catch(() => {});
            toast.error(rawError, {
              action: { label: t("details"), onClick: openParseHistory },
            });
          } else if (Date.now() - startedAt >= MAX_WATCH_MS) {
            abandonStuckJob(jobUrl);
          } else {
            scheduleRetry(pollDelay, run);
            pollDelay = Math.min(pollDelay * POLL_BACKOFF, MAX_POLL_MS);
          }
        } catch (error) {
          // A network drop is expected — retry quietly. But a failure while
          // online (the parse-status endpoint erroring, or a bug turning the
          // completed parse into a local recipe in handleDone) would lose the
          // parse with no signal, so surface it. The claimJobCompletion guard
          // means a handleDone failure reports once, not on every retry.
          if (typeof navigator !== "undefined" && navigator.onLine) {
            captureError(error, { tags: { source: "parse-job-watcher" } });
          }
          scheduleRetry(NETWORK_RETRY_MS, run);
        }
      };
      run();
    },
    [handleDone, navigate, t],
  );

  useEffect(() => {
    // check on mount
    const savedJobIds = getJobIds().filter(Boolean);
    savedJobIds.forEach((jobId) => {
      poll(jobId);
    });

    // listen for new jobs created after mount
    const handler = (event: Event) => {
      const { jobId } = (event as CustomEvent<{ jobId: string }>).detail;
      if (jobId) poll(jobId);
    };
    window.addEventListener("parse-job-created", handler);

    return () => {
      window.removeEventListener("parse-job-created", handler);
      for (const timer of timeouts.current) clearTimeout(timer);
      timeouts.current.clear();
    };
  }, [poll]);

  return { poll };
}
