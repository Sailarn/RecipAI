"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ParsedRecipe } from "@/app/[locale]/recipes/parse/page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseRecipeFromPhoto } from "@/lib/parse-recipe/photo";
import { savePhotoParseResult } from "@/lib/parse-recipe/save-photo-result";
import { PhotoParsingBanner } from "./photo-parsing-banner";

interface ParsePhotoProps {
  locale: string;
  /** Optional override — used by RecipeParseView when an onSuccess callback is provided */
  onResult?: (recipe: ParsedRecipe) => void;
}

export function ParsePhoto({ locale, onResult }: ParsePhotoProps) {
  const t = useTranslations("parse");
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [userComment, setUserComment] = useState("");
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setError(null);
  };

  const handleSubmit = () => {
    if (!file) return;

    const photoFile = file;
    const comment = userComment || undefined;
    const capturedLocale = locale;
    const capturedOnResult = onResult;

    // Reset form immediately
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUserComment("");
    if (inputRef.current) inputRef.current.value = "";

    setIsParsing(true);
    setError(null);

    parseRecipeFromPhoto(photoFile, comment)
      .then(async (recipe) => {
        if (mountedRef.current) setIsParsing(false);

        // RecipeParseView with onSuccess: hand off only if still on-screen.
        // If the user navigated away, fall through to the DB+toast path.
        if (capturedOnResult && mountedRef.current) {
          capturedOnResult(recipe);
          return;
        }

        // Default: queue to parsedRecipes and show toast
        try {
          await savePhotoParseResult(recipe, capturedLocale);
        } catch (err) {
          console.error("[ParsePhoto] failed to save:", err);
          toast.error("Failed to process parsed recipe", {
            duration: 10000,
            closeButton: true,
          });
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Parse failed";
        if (mountedRef.current) {
          setIsParsing(false);
          setError(msg);
        } else {
          toast.error(msg, { duration: 10000, closeButton: true });
        }
      });
  };

  if (isParsing) {
    return (
      <PhotoParsingBanner
        locale={locale}
        onParseAnother={() => setIsParsing(false)}
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
            className="w-full max-h-64 object-contain rounded-xl border border-border cursor-pointer"
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
          className="w-full h-36 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <title>Camera</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
            />
          </svg>
          <span className="text-sm font-medium">{t("photo.cta")}</span>
          <span className="text-xs">{t("photo.hint")}</span>
        </button>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="photo-comment">
          Hints for AI
          <span className="text-muted-foreground font-normal ml-2 text-xs">
            optional
          </span>
        </Label>
        <Textarea
          id="photo-comment"
          placeholder={t("photo.comment_placeholder")}
          value={userComment}
          onChange={(e) => setUserComment(e.target.value)}
          rows={2}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button onClick={handleSubmit} disabled={!file} className="w-full">
        {t("photo.submit")}
      </Button>
    </div>
  );
}
