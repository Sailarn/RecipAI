"use client";

import { Camera } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { AiButton } from "@/components/ui/ai-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ParsedRecipe } from "@/lib/db/schema";
import { useDirectParse } from "@/lib/hooks/use-direct-parse";
import { parseRecipeFromPhoto } from "@/lib/parse-recipe/photo";
import { ParseBackgroundBanner } from "../parse-background-banner";

interface ParsePhotoProps {
  locale: string;
  /** Optional override — when provided, called directly instead of saving to DB + toast */
  onResult?: (recipe: ParsedRecipe) => void;
}

export function ParsePhoto({ locale, onResult }: ParsePhotoProps) {
  const t = useTranslations("parse");
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { isParsing, error, startParse, stopWaiting, clearError } =
    useDirectParse({
      locale,
      source: "photo",
      onResult,
    });

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    clearError();
  };

  const handleSubmit = () => {
    if (!file) return;
    const photoFile = file;

    // Reset form immediately
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";

    startParse((jobId) => parseRecipeFromPhoto(photoFile, jobId));
  };

  if (isParsing) {
    return <ParseBackgroundBanner locale={locale} onReset={stopWaiting} />;
  }

  return (
    <div className="space-y-4 mb-6">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {previewUrl ? (
        <div className="space-y-2">
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: click-only for photo change trigger */}
          {/* biome-ignore lint/performance/noImgElement: preview is a blob object URL, not compatible with next/image */}
          <img
            src={previewUrl}
            alt={t("photoPreviewAlt")}
            className="w-full max-h-64 object-contain rounded-2xl cursor-pointer border border-[var(--glass-card-border)]"
            onClick={() => inputRef.current?.click()}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            {t("photo.change")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="photo-drop-zone w-full h-40 rounded-2xl flex flex-col items-center justify-center gap-2"
        >
          <Camera
            className="w-8 h-8 text-[var(--food-accent)]"
            strokeWidth={1.5}
            aria-label={t("cameraLabel")}
          />
          <span className="[font:var(--type-button)] text-inherit">
            {t("photo.cta")}
          </span>
          <span className="[font:var(--type-caption)] text-inherit">
            {t("photo.hint")}
          </span>
        </button>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <AiButton
        onClick={handleSubmit}
        disabled={!file}
        label={t("analyzeWithAi")}
        loadingLabel={t("analyzing")}
      />
    </div>
  );
}
