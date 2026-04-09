"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ParseBackgroundBanner } from "@/components/parse-background-banner";
import { ParsePhoto } from "@/components/parse-photo";
import { TransitionLink } from "@/components/transition-link";
import { useUrlParse } from "@/lib/hooks/use-url-parse";
import { routes } from "@/lib/routes";
import { ParseForm } from "./components/parse-form";
import { ParseInfoBanner } from "./components/parse-info-banner";
import { ParseResult } from "./components/parse-result";

export interface ParsedRecipe {
  title: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings: number;
  ingredients: Array<{ amount?: number; unit?: string; item: string }>;
  instructions: Array<{ order: number; instruction: string }>;
  imageUrl?: string;
  sourceUrl: string;
  category?: string;
}

type Tab = "url" | "photo";

export default function ParseRecipePage() {
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations("parse");

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
  } = useUrlParse({ locale });

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Parse Recipe</h1>
      <div className="flex items-center justify-between mb-6">
        <TransitionLink
          href={routes.recipes.new(locale)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to create recipe form
        </TransitionLink>
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
          {t("tabs.url")}
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
          {t("tabs.photo")}
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

      {tab === "photo" && <ParsePhoto locale={locale} />}
    </div>
  );
}
