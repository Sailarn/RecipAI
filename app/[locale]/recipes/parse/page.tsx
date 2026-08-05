"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ParseBackgroundBanner } from "@/components/parse-background-banner";
import { ParsePhoto } from "@/components/parse-photo";
import { useTelegramNotify } from "@/lib/hooks/use-telegram-notify";
import { useUrlParse } from "@/lib/hooks/use-url-parse";
import { ParseForm } from "./components/parse-form";
import { ParseInfoBanner } from "./components/parse-info-banner";
import { ParseResult } from "./components/parse-result";

type Tab = "url" | "photo";

export default function ParseRecipePage() {
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations("parse");
  const [tab, setTab] = useState<Tab>("url");
  const { shouldNotify } = useTelegramNotify();

  const {
    url,
    setUrl,
    loading,
    error,
    result,
    jobId,
    handleParse,
    handleSave,
    handleReset,
  } = useUrlParse({ locale, telegramNotify: shouldNotify });

  return (
    <div className="max-w-2xl mx-auto px-4 pt-[max(20px,calc(env(safe-area-inset-top)+8px))] pb-[100px]">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-[22px] font-extrabold text-[var(--fg-1)]">
          {t("pageTitle")}
        </h1>
      </div>

      {/* Tab switcher */}
      <div className="glass-card flex p-[3px] mb-5 w-fit rounded-[14px]">
        {(["url", "photo"] as const).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={`py-[7px] px-5 rounded-[11px] font-sans text-[13px] font-medium cursor-pointer transition-all duration-150 ${
              tab === tabKey
                ? "bg-[rgba(255,180,60,0.18)] border border-[rgba(255,200,100,0.25)] shadow-[0_1px_4px_rgba(0,0,0,0.3)] backdrop-blur-[12px] text-[var(--fg-1)]"
                : "bg-transparent border border-transparent text-[var(--fg-2)]"
            }`}
          >
            {tabKey === "url" ? `🔗 ${t("tabs.url")}` : `📷 ${t("tabs.photo")}`}
          </button>
        ))}
      </div>

      {tab === "url" && (
        <>
          <ParseInfoBanner />
          <ParseForm
            url={url}
            onUrlChange={setUrl}
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
