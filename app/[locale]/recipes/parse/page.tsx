"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ParseBackgroundBanner } from "@/components/parse-background-banner";
import { ParsePhoto } from "@/components/parse-photo";
import { useUrlParse } from "@/lib/hooks/use-url-parse";
import { ParseForm } from "./components/parse-form";
import { ParseInfoBanner } from "./components/parse-info-banner";
import { ParseResult } from "./components/parse-result";

export interface ParsedRecipe {
  title: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings: number;
  ingredients: Array<{
    amount?: number;
    unit?: string;
    item: string;
    ua?: string | null;
    category?: string | null;
  }>;
  instructions: Array<{ order: number; instruction: string }>;
  imageUrl?: string;
  sourceUrl: string;
  category?: string;
}

type Tab = "url" | "photo";

export default function ParseRecipePage() {
  const params = useParams();
  const locale = params.locale as string;
  const _t = useTranslations("parse");
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
      <div
        className="mb-6"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 800,
            color: "var(--fg-1)",
          }}
        >
          Import Recipe
        </h1>
      </div>

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
        {(["url", "photo"] as const).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            style={{
              padding: "7px 20px",
              borderRadius: 11,
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
              ...(tab === tabKey
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
            {tabKey === "url" ? "🔗 URL" : "📷 Photo"}
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

      {tab === "photo" && <ParsePhoto locale={locale} />}
    </div>
  );
}
