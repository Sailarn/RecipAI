"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { AiButton } from "@/components/ui/ai-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { useDirectParse } from "@/lib/hooks/use-direct-parse";
import {
  MAX_RECIPE_TEXT_CHARS,
  MIN_RECIPE_TEXT_CHARS,
  parseRecipeFromText,
} from "@/lib/parse-recipe/text";
import { ParseBackgroundBanner } from "../parse-background-banner";

interface ParseTextProps {
  locale: string;
}

/** Import a recipe from pasted text — typically an AI chat's answer. */
export function ParseText({ locale }: ParseTextProps) {
  const t = useTranslations("parse");
  const [text, setText] = useState("");
  const { isParsing, error, startParse, stopWaiting, clearError } =
    useDirectParse({ locale, source: "text" });

  const canSubmit = text.trim().length >= MIN_RECIPE_TEXT_CHARS;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const recipeText = text;
    setText("");
    startParse((jobId) => parseRecipeFromText(recipeText, jobId));
  };

  if (isParsing) {
    return <ParseBackgroundBanner locale={locale} onReset={stopWaiting} />;
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="space-y-2">
        <label
          htmlFor="recipe-text"
          className="block font-sans text-[12px] font-medium text-[var(--fg-2)]"
        >
          {t("text.label")}
        </label>
        <Textarea
          id="recipe-text"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            clearError();
          }}
          placeholder={t("text.placeholder")}
          maxLength={MAX_RECIPE_TEXT_CHARS}
          rows={10}
          className="min-h-48"
        />
        <p className="font-sans text-[12px] text-[var(--fg-3)]">
          {t("text.hint")}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <AiButton
        onClick={handleSubmit}
        disabled={!canSubmit}
        label={t("analyzeWithAi")}
        loadingLabel={t("analyzing")}
      />
    </div>
  );
}
