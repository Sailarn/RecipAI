"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/auth-client";
import { recordParseHistory } from "@/lib/db/parse-history";
import type { ParsedRecipe } from "@/lib/db/schema";
import { claimJobCompletion } from "@/lib/parse-job-completion";
import {
  getJobIds,
  getUploadToken,
  removeJobId,
} from "@/lib/parse-job-storage";
import { announceFailedParse } from "@/lib/parse-recipe/announce-parse";
import { completeLinkParse } from "@/lib/parse-recipe/complete-link-parse";
import { failedParseHistoryEntry } from "@/lib/parse-recipe/parse-history-entry";
import { api, routes } from "@/lib/routes";
import { useTriggerSync } from "@/lib/sync-context";
import { captureError, trackEvent } from "@/lib/telemetry";
import { useNavigate } from "@/lib/transitions";

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
// the parse doesn't just vanish. The server also fails such jobs on read.
const MAX_WATCH_MS = 15 * 60_000;

interface JobStatus {
  status: string;
  result: ParsedRecipe | null;
  error: string | null;
  url: string | null;
  /** Set when the server already saved the recipe (signed-in imports). */
  savedRecipeId?: string;
}

export function useParseJobWatcher() {
  // `t`, `navigate` and `triggerSync` are read through refs so `poll` stays
  // stable and the mount effect runs once. Re-running it would clear every
  // pending poll timer and then skip the already-watched jobs, so a navigation
  // mid-parse would silently stop polling until the next app load.
  const t = useTranslations("parse");
  const tRef = useRef(t);
  tRef.current = t;
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const triggerSync = useTriggerSync();
  const triggerSyncRef = useRef(triggerSync);
  triggerSyncRef.current = triggerSync;
  const { data: session } = authClient.useSession();
  const isSignedIn = Boolean(session);
  // Jobs that are already being polled (or have reached a terminal state), so
  // a job announced twice (saved id + parse-job-created event + the server's
  // active list) gets one poll loop, not several that all complete it. Job IDs
  // are unique per parse, so once seen here a job is never polled again for
  // the lifetime of the watcher.
  const watchedJobs = useRef<Set<string>>(new Set());
  const timeouts = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const handleDone = useCallback(async (id: string, job: JobStatus) => {
    const uploadToken = getUploadToken(id) ?? undefined;
    removeJobId(id);
    await completeLinkParse({
      jobId: id,
      recipe: job.result as ParsedRecipe,
      jobUrl: job.url ?? "",
      savedRecipeId: job.savedRecipeId,
      uploadToken,
      triggerSync: () => triggerSyncRef.current(),
      labels: {
        added: tRef.current("addedToRecipes"),
        alreadySaved: tRef.current("alreadySaved"),
      },
    });
  }, []);

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
        navigateRef.current.push(routes.parseHistory(locale));
      };

      const handleFailed = (jobUrl: string | null, rawError: string) => {
        removeJobId(id);
        trackEvent("parse_failed", { source: "url", reason: rawError });
        const historyEntry = failedParseHistoryEntry(
          id,
          jobUrl ?? "",
          rawError,
        );
        recordParseHistory(historyEntry).catch(() => {});
        announceFailedParse({
          jobId: id,
          title: historyEntry.title,
          reason: historyEntry.reason ?? rawError,
        });
        toast.error(historyEntry.reason ?? rawError, {
          action: { label: tRef.current("details"), onClick: openParseHistory },
        });
      };

      const run = async () => {
        try {
          const res = await fetch(api.parseQueueJob(id));
          const job = (await res.json()) as JobStatus;

          if (job.status === "done") {
            // The parse page may have already handled this job.
            if (!claimJobCompletion(id)) return;
            await handleDone(id, job);
          } else if (job.status === "failed") {
            if (!claimJobCompletion(id)) return;
            handleFailed(job.url, job.error || tRef.current("failedGeneric"));
          } else if (Date.now() - startedAt >= MAX_WATCH_MS) {
            if (!claimJobCompletion(id)) return;
            handleFailed(job.url, tRef.current("timedOut"));
          } else {
            scheduleRetry(pollDelay, run);
            pollDelay = Math.min(pollDelay * POLL_BACKOFF, MAX_POLL_MS);
          }
        } catch (error) {
          // A network drop is expected — retry quietly. But a failure while
          // online (the parse-status endpoint erroring, or a bug saving the
          // completed parse in handleDone) would lose the parse with no
          // signal, so surface it. The claimJobCompletion guard means a
          // handleDone failure reports once, not on every retry.
          if (typeof navigator !== "undefined" && navigator.onLine) {
            captureError(error, { tags: { source: "parse-job-watcher" } });
          }
          scheduleRetry(NETWORK_RETRY_MS, run);
        }
      };
      run();
    },
    [handleDone],
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

  // A signed-in user's parses can start anywhere — another device, the bot —
  // so also follow every unfinished job the server knows about, on launch and
  // whenever the app comes back to the foreground.
  useEffect(() => {
    if (!isSignedIn) return;
    const followActiveJobs = () => {
      fetch(api.parseQueueActive)
        .then((res) => (res.ok ? res.json() : { jobs: [] }))
        .then(({ jobs }: { jobs: Array<{ id: string }> }) => {
          for (const job of jobs) poll(job.id);
        })
        // Offline is a normal state; the next foreground tries again.
        .catch(() => {});
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") followActiveJobs();
    };
    followActiveJobs();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [isSignedIn, poll]);

  return { poll };
}
