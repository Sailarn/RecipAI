"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { apiFetch, isMaintenanceError } from "@/lib/api/api-fetch";
import type { ParsedRecipe } from "@/lib/db/schema";
import { usePushSubscription } from "@/lib/hooks/use-push-subscription";
import { logger } from "@/lib/logger";
import { claimJobCompletion } from "@/lib/parse-job-completion";
import {
  PARSE_JOB_SETTLED_EVENT,
  parseJobSettledDetail,
} from "@/lib/parse-job-events";
import { addJobId, getJobIds } from "@/lib/parse-job-storage";
import type { SavedParse } from "@/lib/parse-recipe/announce-parse";
import { completeLinkParse } from "@/lib/parse-recipe/complete-link-parse";
import { api } from "@/lib/routes";
import { useTriggerSync } from "@/lib/sync-context";
import { trackEvent } from "@/lib/telemetry";
import { isValidUrl } from "@/lib/url";

interface EnqueueResponse {
  jobId: string;
  uploadToken?: string;
  cached: boolean;
  result?: ParsedRecipe;
  /** Signed in: the server saves the recipe into the user's library. */
  serverSaves: boolean;
  savedRecipeId?: string;
  alreadySaved?: boolean;
  /** The server kicked /process off itself (Telegram notifications on). */
  telegramNotify: boolean;
}

interface UseUrlParseOptions {
  // When the user has Telegram notifications on, the server also messages the
  // recipe card through the bot on completion. It confirms it actually
  // resolved a chat before taking over the /process call.
  telegramNotify?: boolean;
}

/**
 * The parse page's link import. Completion belongs to the global parse-job
 * watcher, which saves the recipe and announces it; the page follows one job
 * at a time and shows its outcome when the watcher settles it.
 */
export function useUrlParse({ telegramNotify }: UseUrlParseOptions = {}) {
  const t = useTranslations("parse");
  const triggerSync = useTriggerSync();
  const { subscription, subscribe, isSupported, permission } =
    usePushSubscription();

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedParse | null>(null);
  // The job this page is following. "Parse another" lets go of it — the
  // watcher still finishes it, but its outcome no longer lands on this page.
  const followedJobRef = useRef<string | null>(null);

  // Resume the newest unfinished job after a reload or a return to the page.
  useEffect(() => {
    const savedJobId = getJobIds().at(-1) ?? null;
    if (!savedJobId) return;
    followedJobRef.current = savedJobId;
    setJobId(savedJobId);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = parseJobSettledDetail(event);
      if (!detail || detail.jobId !== followedJobRef.current) return;
      followedJobRef.current = null;
      setJobId(null);
      if (detail.status === "done") {
        setSaved({
          recipeId: detail.recipeId,
          recipe: detail.recipe,
          alreadySaved: detail.alreadySaved,
        });
      } else {
        setError(detail.reason);
      }
    };
    window.addEventListener(PARSE_JOB_SETTLED_EVENT, handler);
    return () => window.removeEventListener(PARSE_JOB_SETTLED_EVENT, handler);
  }, []);

  const handleParse = async () => {
    if (!isValidUrl(url)) {
      setError(t("invalidUrl"));
      return;
    }
    setLoading(true);
    setError(null);
    setSaved(null);

    try {
      // Subscribe to push notifications if not yet subscribed.
      // Race against a 3s timeout so a stuck serviceWorker.ready (e.g. Chrome
      // on iOS WKWebView) never blocks the parse from starting.
      let pushEndpoint: string | undefined;
      if (isSupported && permission !== "denied") {
        const timeout = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 3000),
        );
        const sub =
          subscription ?? (await Promise.race([subscribe(), timeout]));
        pushEndpoint = sub?.endpoint;
      }

      const res = await apiFetch(api.parseQueue, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, pushEndpoint, telegramNotify }),
      });

      if (!res.ok) throw new Error(t("jobCreateFailed"));
      const job = (await res.json()) as EnqueueResponse;
      trackEvent("parse_started", {
        source: "url",
        domain: new URL(url).hostname,
      });

      // Instant cache hit: the link was parsed before, so the job is DONE
      // already. Complete it right here instead of handing it to the watcher,
      // which assumes a slow parse.
      if (job.cached && job.result) {
        claimJobCompletion(job.jobId);
        const completed = await completeLinkParse({
          jobId: job.jobId,
          recipe: job.result,
          jobUrl: url,
          savedRecipeId: job.savedRecipeId,
          alreadySaved: job.alreadySaved,
          uploadToken: job.uploadToken,
          triggerSync,
          labels: {
            added: t("addedToRecipes"),
            alreadySaved: t("alreadySaved"),
          },
        });
        setSaved({ ...completed, recipe: job.result });
        setLoading(false);
        return;
      }

      addJobId(job.jobId, job.uploadToken);
      followedJobRef.current = job.jobId;
      setJobId(job.jobId);
      setLoading(false);

      window.dispatchEvent(
        new CustomEvent("parse-job-created", { detail: { jobId: job.jobId } }),
      );

      // A Telegram-notify job was already kicked off server-side; starting it
      // again here would race the server for the same job.
      if (job.telegramNotify) return;
      fetch(api.parseQueueProcess, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.jobId }),
      }).catch((caughtError) => logger.error("process error:", caughtError));
    } catch (caughtError) {
      setError(
        isMaintenanceError(caughtError)
          ? caughtError.message
          : t("networkError"),
      );
      setLoading(false);
    }
  };

  const handleReset = () => {
    // Stop following the job here but keep it registered: the global watcher
    // finishes it, and resumes it after a reload.
    followedJobRef.current = null;
    setSaved(null);
    setUrl("");
    setError(null);
    setJobId(null);
  };

  return {
    url,
    setUrl,
    loading,
    error,
    saved,
    jobId,
    handleParse,
    handleReset,
  };
}
