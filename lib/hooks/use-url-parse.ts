"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { apiFetch, isMaintenanceError } from "@/lib/api/api-fetch";
import { db } from "@/lib/db/db";
import { recordParseHistory } from "@/lib/db/parse-history";
import { addParsedRecipeResult } from "@/lib/db/parsed-recipes";
import {
  PARSE_JOB_STATUS,
  type ParsedRecipe,
  type ParsedRecipeEntry,
} from "@/lib/db/schema";
import { usePushSubscription } from "@/lib/hooks/use-push-subscription";
import { logger } from "@/lib/logger";
import { claimJobCompletion } from "@/lib/parse-job-completion";
import {
  PARSED_RECIPE_CREATED_EVENT,
  parseParsedRecipeCreatedEvent,
} from "@/lib/parse-job-events";
import {
  addJobId,
  getJobIds,
  getUploadToken,
  removeJobId,
  storePendingUploadToken,
} from "@/lib/parse-job-storage";
import { friendlyParseError } from "@/lib/parse-recipe/friendly-parse-error";
import {
  doneParseHistoryEntry,
  failedParseHistoryEntry,
} from "@/lib/parse-recipe/parse-history-entry";
import { api, routes } from "@/lib/routes";
import { trackEvent } from "@/lib/telemetry";
import { useNavigate } from "@/lib/transitions";
import { isValidUrl } from "@/lib/url";

interface UseUrlParseOptions {
  locale: string;
  onSuccess?: (data: ParsedRecipeEntry) => void;
  // When the user has Telegram notifications on, the parse is handed off to the
  // server (auto-save + bot message on completion) instead of the in-app review
  // flow. The server confirms it actually resolved a chat before we hand off.
  telegramNotify?: boolean;
}

export function useUrlParse({
  locale,
  onSuccess,
  telegramNotify,
}: UseUrlParseOptions) {
  const navigate = useNavigate();
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const { subscription, subscribe, isSupported, permission } =
    usePushSubscription();

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [activeParsedRecipeId, setActiveParsedRecipeId] = useState<
    string | null
  >(null);

  const parsedRecipe = useLiveQuery(async () => {
    if (activeParsedRecipeId) {
      return db.parsedRecipes.get(activeParsedRecipeId);
    }
    if (loading || jobId) return undefined;
    return db.parsedRecipes.orderBy("createdAt").reverse().first();
  }, [activeParsedRecipeId, loading, jobId]);
  const result = parsedRecipe ?? null;

  // `notifyMode` jobs are saved + announced server-side (Telegram notifications
  // on). The client polls only to surface the terminal state in-app — a success
  // toast or the failure error — without building a durable review entry or
  // re-saving (which would duplicate the server's copy).
  const poll = useCallback((id: string, notifyMode = false) => {
    const run = async () => {
      try {
        const statusRes = await fetch(api.parseQueueJob(id));
        const { status, result, error, url: jobUrl } = await statusRes.json();

        if (status === PARSE_JOB_STATUS.DONE) {
          // If we've navigated away, don't claim — let the global watcher show
          // the toast instead. If the watcher already claimed, also bail.
          if (!isMountedRef.current || !claimJobCompletion(id)) {
            setLoading(false);
            setJobId(null);
            return;
          }
          const parsed = result as ParsedRecipe;
          if (notifyMode) {
            recordParseHistory(
              doneParseHistoryEntry(
                id,
                parsed.title,
                parsed.sourceUrl ?? jobUrl,
              ),
            ).catch(() => {});
            trackEvent("parse_succeeded", { source: "url" });
            toast.success("Saved to RecipAI", {
              description: "Added to your recipes.",
            });
            setLoading(false);
            setJobId(null);
            return;
          }
          const uploadToken = getUploadToken(id);
          if (uploadToken) storePendingUploadToken(uploadToken);
          removeJobId(id);
          const entry = await addParsedRecipeResult(parsed);
          setActiveParsedRecipeId(entry.id);
          recordParseHistory(
            doneParseHistoryEntry(id, parsed.title, parsed.sourceUrl ?? jobUrl),
          ).catch(() => {});
          trackEvent("parse_succeeded", { source: "url" });
          setLoading(false);
          setJobId(null);
        } else if (status === PARSE_JOB_STATUS.FAILED) {
          if (!isMountedRef.current || !claimJobCompletion(id)) {
            setLoading(false);
            setJobId(null);
            return;
          }
          const rawError: string = error || "Failed to parse recipe";
          recordParseHistory(
            failedParseHistoryEntry(id, jobUrl, rawError),
          ).catch(() => {});
          trackEvent("parse_failed", { source: "url", reason: rawError });
          setError(friendlyParseError(rawError));
          setLoading(false);
          setJobId(null);
          removeJobId(id);
        } else {
          pollRef.current = setTimeout(run, 3000);
        }
      } catch {
        setError("Network error while checking status");
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const savedJobId = getJobIds().at(-1) ?? null;
    if (!savedJobId) return;
    setJobId(savedJobId);
    setLoading(true);
    poll(savedJobId);
  }, [poll]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = parseParsedRecipeCreatedEvent(event);
      if (!detail || detail.jobId !== jobId) return;
      setActiveParsedRecipeId(detail.entryId);
      setLoading(false);
      setJobId(null);
    };

    window.addEventListener(PARSED_RECIPE_CREATED_EVENT, handler);
    return () => {
      window.removeEventListener(PARSED_RECIPE_CREATED_EVENT, handler);
    };
  }, [jobId]);

  const handleParse = async () => {
    if (!isValidUrl(url)) {
      setError("Please enter a valid URL including https://");
      return;
    }
    setLoading(true);
    setError(null);
    setActiveParsedRecipeId(null);

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
        body: JSON.stringify({
          url,
          pushEndpoint,
          telegramNotify,
        }),
      });

      if (!res.ok) throw new Error("Failed to create parse job");
      const {
        jobId: newJobId,
        uploadToken,
        cached,
        result: cachedResult,
        telegramNotify: notifyConfirmed,
      } = await res.json();
      trackEvent("parse_started", {
        source: "url",
        domain: new URL(url).hostname,
      });

      // Telegram-notify hand-off: the server saves the recipe and messages the
      // user via the bot on completion, so skip the in-app *review* flow (no
      // durable entry, no background watcher, no client /process call). A cache
      // hit is already saved server-side; otherwise poll in notify mode purely
      // to surface the terminal state in-app — the "parsing in background"
      // banner, then a success toast or the failure error.
      if (notifyConfirmed) {
        setUrl("");
        if (cached) {
          trackEvent("parse_succeeded", { source: "url" });
          toast.success("Saved to RecipAI", {
            description: "Added to your recipes.",
          });
          setLoading(false);
          return;
        }
        setJobId(newJobId);
        setLoading(false);
        poll(newJobId, true);
        return;
      }

      // Instant cache hit: the URL was already parsed, so the job is DONE
      // immediately. Show the result inline now instead of the background
      // banner + watcher handoff (which assumes a slow parse). Claim it so the
      // global watcher won't also fire a toast, and don't register it for
      // background polling.
      if (cached && cachedResult) {
        const parsed = cachedResult as ParsedRecipe;
        claimJobCompletion(newJobId);
        if (uploadToken) storePendingUploadToken(uploadToken);
        const entry = await addParsedRecipeResult(parsed);
        setActiveParsedRecipeId(entry.id);
        recordParseHistory(
          doneParseHistoryEntry(
            newJobId,
            parsed.title,
            parsed.sourceUrl ?? url,
          ),
        ).catch(() => {});
        trackEvent("parse_succeeded", { source: "url" });
        setLoading(false);
        return;
      }

      addJobId(newJobId, uploadToken);
      setJobId(newJobId);
      setLoading(false);

      window.dispatchEvent(
        new CustomEvent("parse-job-created", { detail: { jobId: newJobId } }),
      );

      fetch(api.parseQueueProcess, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: newJobId }),
      }).catch((caughtError) => logger.error("process error:", caughtError));
    } catch (caughtError) {
      setError(
        isMaintenanceError(caughtError)
          ? caughtError.message
          : "Network error. Please try again.",
      );
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    trackEvent("parse_reviewed", undefined);
    if (onSuccess) {
      onSuccess(result);
      await db.parsedRecipes.delete(result.id);
      setActiveParsedRecipeId(null);
      navigate.back();
    } else {
      localStorage.setItem("parsedRecipe", JSON.stringify(result));
      await db.parsedRecipes.delete(result.id);
      setActiveParsedRecipeId(null);
      navigate.push(routes.recipes.new(locale));
    }
  };

  const handleReset = async () => {
    if (result) {
      await db.parsedRecipes.delete(result.id);
    }
    setActiveParsedRecipeId(null);
    setUrl("");
    setError(null);
    if (jobId) removeJobId(jobId);
    setJobId(null);
  };

  return {
    url,
    setUrl,
    loading,
    error,
    result,
    jobId,
    handleParse,
    handleSave,
    handleReset,
  };
}
