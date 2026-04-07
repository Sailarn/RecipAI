"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ParseForm } from "@/app/[locale]/recipes/parse/components/parse-form";
import { ParseInfoBanner } from "@/app/[locale]/recipes/parse/components/parse-info-banner";
import { ParseResult } from "@/app/[locale]/recipes/parse/components/parse-result";
import type { ParsedRecipe } from "@/app/[locale]/recipes/parse/page";
import { Button } from "@/components/ui";
import { addJobId } from "@/lib/parse-job-storage";
import { api, routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

interface RecipeParseViewProps {
  locale: string;
  // When provided, called with parsed data and the view navigates back instead
  // of pushing to the new-recipe page. Used when on the navigation stack.
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

export function RecipeParseView({ locale, onSuccess }: RecipeParseViewProps) {
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
          setResult(result as ParsedRecipe);
          setLoading(false);
          setJobId(null);
          localStorage.removeItem("parseJobId");
        } else if (status === "failed") {
          setError(error || "Failed to parse recipe");
          setLoading(false);
          setJobId(null);
          localStorage.removeItem("parseJobId");
        } else {
          pollRef.current = setTimeout(run, 3000);
        }
      } catch {
        setError("Network error while checking status");
        setLoading(false);
        setJobId(null);
        localStorage.removeItem("parseJobId");
      }
    };
    run();
  }, []);

  useEffect(() => {
    const savedJobId = localStorage.getItem("parseJobId");
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

      const { jobId: newJobId } = await res.json();
      addJobId(newJobId);
      setJobId(newJobId);
      setLoading(false);

      window.dispatchEvent(
        new CustomEvent("parse-job-created", { detail: { jobId: newJobId } }),
      );

      fetch(api.parseQueueProcess, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: newJobId }),
      })
        .then((r) => r.json())
        .catch((err) => console.error("process error:", err));
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!result) return;
    if (onSuccess) {
      // Stack context: pass data back to the caller and go back
      onSuccess(result);
      navigate.back();
    } else {
      // Standalone: use localStorage and navigate normally
      localStorage.setItem("parsedRecipe", JSON.stringify(result));
      navigate.push(routes.recipes.new(locale));
    }
  };

  const handleReset = () => {
    setResult(null);
    setUrl("");
    setUserComment("");
    setError(null);
    setJobId(null);
    localStorage.removeItem("parseJobId");
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Parse Recipe from URL</h1>
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => navigate.back()}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to create recipe form
        </button>
      </div>
      <ParseInfoBanner />
      <ParseForm
        url={url}
        onUrlChange={setUrl}
        userComment={userComment}
        onCommentChange={setUserComment}
        loading={loading}
        error={error}
        onSubmit={handleParse}
      />
      {result && (
        <ParseResult
          result={result}
          onSave={handleSave}
          onReset={handleReset}
        />
      )}
      {jobId && !result && (
        <div className="mt-4 p-4 rounded-xl bg-muted text-sm text-muted-foreground text-center space-y-3">
          <p>⏳ Parsing in background...</p>
          <p className="text-xs">You'll get a notification when it's ready.</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={handleReset}>
              Parse another
            </Button>
            <Button
              size="sm"
              onClick={() => navigate.push(routes.recipes.list(locale))}
            >
              Go to recipes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
