"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ParsedRecipe } from "@/lib/db/schema";
import {
  addJobId,
  getJobIds,
  getUploadToken,
  removeJobId,
  storePendingUploadToken,
} from "@/lib/parse-job-storage";
import { api, routes } from "@/lib/routes";
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
        const { status, result, error } = await statusRes.json();

        if (status === "done") {
          const uploadToken = getUploadToken(id);
          if (uploadToken) storePendingUploadToken(uploadToken);
          removeJobId(id);
          setResult(result as ParsedRecipe);
          setLoading(false);
          setJobId(null);
        } else if (status === "failed") {
          const rawError: string = error || "Failed to parse recipe";
          const friendlyError =
            rawError.includes("503") ||
            rawError.includes("Service Unavailable") ||
            rawError.includes("high demand")
              ? "Gemini is experiencing high demand right now. Please try again in a moment."
              : rawError.includes("429") || rawError.includes("quota")
                ? "API quota exceeded. Please try again later."
                : rawError.includes("Could not extract") ||
                    rawError.includes("too little HTML")
                  ? "Couldn't read this page — the site may block scrapers. Try pasting the URL again or use a different source."
                  : rawError;
          setError(friendlyError);
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
      const res = await fetch(api.parseQueue, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, userComment: userComment || undefined }),
      });

      const { jobId: newJobId, uploadToken } = await res.json();
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
      }).catch((err) => console.error("process error:", err));
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!result) return;
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
