"use client";

import { useState } from "react";
import { ParseForm } from "@/app/[locale]/recipes/parse/components/parse-form";
import { ParseInfoBanner } from "@/app/[locale]/recipes/parse/components/parse-info-banner";
import { ParseResult } from "@/app/[locale]/recipes/parse/components/parse-result";
import type { ParsedRecipe } from "@/app/[locale]/recipes/parse/page";
import { ParseBackgroundBanner } from "@/components/parse-background-banner";
import { ParsePhoto } from "@/components/parse-photo";
import { useUrlParse } from "@/lib/hooks/use-url-parse";
import { useNavigate } from "@/lib/transitions";

interface RecipeParseViewProps {
  locale: string;
  // When provided, called with parsed data and the view navigates back instead
  // of pushing to the new-recipe page. Used when on the navigation stack.
  onSuccess?: (data: ParsedRecipe) => void;
}

type Tab = "url" | "photo";

export function RecipeParseView({ locale, onSuccess }: RecipeParseViewProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("url");

  const {
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
  } = useUrlParse({ locale, onSuccess });

  // Only needed when onSuccess is provided (stack-embedded context).
  // When onSuccess is absent, ParsePhoto calls handlePhotoParseResult directly.
  const handlePhotoResult = onSuccess
    ? (recipe: ParsedRecipe) => {
        onSuccess(recipe);
        navigate.back();
      }
    : undefined;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Parse Recipe</h1>
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => navigate.back()}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to create recipe form
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted mb-6 w-fit">
        <button
          type="button"
          onClick={() => setTab("url")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "url"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          URL
        </button>
        <button
          type="button"
          onClick={() => setTab("photo")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "photo"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Photo
        </button>
      </div>

      {tab === "url" && (
        <>
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
            <ParseBackgroundBanner locale={locale} onReset={handleReset} />
          )}
        </>
      )}

      {tab === "photo" && (
        <ParsePhoto locale={locale} onResult={handlePhotoResult} />
      )}
    </div>
  );
}
