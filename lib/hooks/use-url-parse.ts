"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordParseHistory } from "@/lib/db/parse-history";
import { PARSE_JOB_STATUS, type ParsedRecipe } from "@/lib/db/schema";
import { usePushSubscription } from "@/lib/hooks/use-push-subscription";
import { logger } from "@/lib/logger";
import { claimJobCompletion } from "@/lib/parse-job-completion";
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

interface UseUrlParseOptions {
  locale: string;
  onSuccess?: (data: ParsedRecipe) => void;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function useUrlParse({ locale, onSuccess }: UseUrlParseOptions) {
  const navigate = useNavigate();
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { subscription, subscribe, isSupported, permission } =
    usePushSubscription();

  const [url, setUrl] = useState("");
  const [userComment, setUserComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParsedRecipe | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const poll = useCallback((id: string) => {
    const run = async () => {
      try {
        const statusRes = await fetch(api.parseQueueJob(id));
        const { status, result, error, url: jobUrl } = await statusRes.json();

        if (status === PARSE_JOB_STATUS.DONE) {
          // The global watcher may have already handled this job (e.g. it
          // completed in the background before this page resumed polling it).
          // If so, bail without re-running side effects — the toast/bell entry
          // it created is the single source of truth.
          if (!claimJobCompletion(id)) {
            setLoading(false);
            setJobId(null);
            return;
          }
          const parsed = result as ParsedRecipe;
          const uploadToken = getUploadToken(id);
          if (uploadToken) storePendingUploadToken(uploadToken);
          removeJobId(id);
          recordParseHistory(
            doneParseHistoryEntry(id, parsed.title, parsed.sourceUrl ?? jobUrl),
          ).catch(() => {});
          trackEvent("parse_succeeded", { source: "url" });
          setResult(parsed);
          setLoading(false);
          setJobId(null);
        } else if (status === PARSE_JOB_STATUS.FAILED) {
          if (!claimJobCompletion(id)) {
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
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const handleParse = async () => {
    if (!isValidUrl(url)) {
      setError("Please enter a valid URL including https://");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

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

      const res = await fetch(api.parseQueue, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          userComment: userComment || undefined,
          pushEndpoint,
        }),
      });

      if (!res.ok) throw new Error("Failed to create parse job");
      const { jobId: newJobId, uploadToken } = await res.json();
      addJobId(newJobId, uploadToken);
      setJobId(newJobId);
      setLoading(false);
      trackEvent("parse_started", {
        source: "url",
        domain: new URL(url).hostname,
      });

      window.dispatchEvent(
        new CustomEvent("parse-job-created", { detail: { jobId: newJobId } }),
      );

      fetch(api.parseQueueProcess, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: newJobId }),
      }).catch((caughtError) => logger.error("process error:", caughtError));
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!result) return;
    trackEvent("parse_reviewed", undefined);
    if (onSuccess) {
      onSuccess(result);
      navigate.back();
    } else {
      localStorage.setItem("parsedRecipe", JSON.stringify(result));
      navigate.push(routes.recipes.new(locale));
    }
  };

  const handleReset = () => {
    setResult(null);
    setUrl("");
    setUserComment("");
    setError(null);
    if (jobId) removeJobId(jobId);
    setJobId(null);
  };

  return {
    url,
    setUrl,
    userComment,
    setUserComment,
    loading,
    error,
    result,
    jobId,
    handleParse,
    handleSave,
    handleReset,
  };
}
