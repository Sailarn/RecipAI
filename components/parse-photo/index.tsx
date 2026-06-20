"use client";

import { Camera } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AiButton } from "@/components/ui/ai-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { recordParseHistory } from "@/lib/db/parse-history";
import type { ParsedRecipe } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import {
  donePhotoHistoryEntry,
  failedPhotoHistoryEntry,
} from "@/lib/parse-recipe/parse-history-entry";
import { parseRecipeFromPhoto } from "@/lib/parse-recipe/photo";
import { savePhotoParseResult } from "@/lib/parse-recipe/save-photo-result";
import { routes } from "@/lib/routes";
import { trackEvent } from "@/lib/telemetry";
import { useNavigate } from "@/lib/transitions";
import { generateId } from "@/lib/utils";
import { ParseBackgroundBanner } from "../parse-background-banner";

interface ParsePhotoProps {
  locale: string;
  /** Optional override — when provided, called directly instead of saving to DB + toast */
  onResult?: (recipe: ParsedRecipe) => void;
}

export function ParsePhoto({ locale, onResult }: ParsePhotoProps) {
  const t = useTranslations("parse");
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
    setError(null);
  };

  const handleSubmit = () => {
    if (!file) return;

    const photoFile = file;
    const parseJobId = generateId();
    const capturedLocale = locale;
    const capturedOnResult = onResult;

    // Reset form immediately
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";

    setIsParsing(true);
    setError(null);
    trackEvent("parse_started", { source: "photo" });

    parseRecipeFromPhoto(photoFile, parseJobId)
      .then(async (recipe) => {
        if (mountedRef.current) setIsParsing(false);
        trackEvent("parse_succeeded", { source: "photo" });
        recordParseHistory(
          donePhotoHistoryEntry(parseJobId, recipe.title),
        ).catch(() => {});

        // Hand off only if still on-screen; otherwise fall through to DB+toast path.
        if (capturedOnResult && mountedRef.current) {
          capturedOnResult(recipe);
          return;
        }

        // Default: queue to parsedRecipes and show toast
        try {
          await savePhotoParseResult(recipe, capturedLocale);
        } catch (err) {
          logger.error("[ParsePhoto] failed to save:", err);
          toast.error("Failed to process parsed recipe", {
            duration: 10000,
            closeButton: true,
          });
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Parse failed";
        trackEvent("parse_failed", {
          source: "photo",
          reason: err instanceof Error ? err.message : String(err),
        });
        recordParseHistory(failedPhotoHistoryEntry(parseJobId, msg)).catch(
          () => {},
        );
        if (mountedRef.current) {
          setIsParsing(false);
          setError(msg);
        } else {
          toast.error(msg, {
            duration: 10000,
            closeButton: true,
            action: {
              label: "Details",
              onClick: () => navigate.push(routes.parseHistory(capturedLocale)),
            },
          });
        }
      });
  };

  if (isParsing) {
    return (
      <ParseBackgroundBanner
        locale={locale}
        onReset={() => setIsParsing(false)}
      />
    );
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
            alt="Recipe preview"
            className="w-full max-h-64 object-contain rounded-2xl cursor-pointer"
            style={{ border: "1px solid var(--glass-card-border)" }}
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
            className="w-8 h-8"
            style={{ color: "var(--food-accent)" }}
            strokeWidth={1.5}
            aria-label="Camera"
          />
          <span style={{ font: "var(--type-button)", color: "inherit" }}>
            {t("photo.cta")}
          </span>
          <span style={{ font: "var(--type-caption)", color: "inherit" }}>
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
        label="Analyze with AI"
        loadingLabel="Analyzing…"
      />
    </div>
  );
}
