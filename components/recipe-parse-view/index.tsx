"use client";

import { useState } from "react";
import { ParseForm } from "@/app/[locale]/recipes/parse/components/parse-form";
import { ParseInfoBanner } from "@/app/[locale]/recipes/parse/components/parse-info-banner";
import { ParseResult } from "@/app/[locale]/recipes/parse/components/parse-result";
import { ParseBackgroundBanner } from "@/components/parse-background-banner";
import { ParsePhoto } from "@/components/parse-photo";
import type { ParsedRecipe } from "@/lib/db/schema";
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
      <h1
        className="mb-6"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 22,
          fontWeight: 800,
          color: "var(--fg-1)",
        }}
      >
        Import Recipe
      </h1>

      {/* Tab switcher */}
      <div
        className="flex p-[3px] mb-5 w-fit"
        style={{
          background: "var(--glass-card-bg)",
          backdropFilter: "var(--glass-card-blur)",
          WebkitBackdropFilter: "var(--glass-card-blur)",
          border: "1px solid var(--glass-card-border)",
          boxShadow: "var(--glass-card-shadow)",
          borderRadius: 14,
        }}
      >
        {(["url", "photo"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              padding: "7px 20px",
              borderRadius: 11,
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
              ...(tab === t
                ? {
                    background: "rgba(255,180,60,0.18)",
                    border: "1px solid rgba(255,200,100,0.25)",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    color: "var(--fg-1)",
                  }
                : {
                    background: "transparent",
                    border: "1px solid transparent",
                    color: "var(--fg-2)",
                  }),
            }}
          >
            {t === "url" ? "🔗 URL" : "📷 Photo"}
          </button>
        ))}
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
