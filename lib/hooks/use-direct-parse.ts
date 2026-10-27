"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { recordParseHistory } from "@/lib/db/parse-history";
import type { ParsedRecipe } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import {
  donePhotoHistoryEntry,
  failedPhotoHistoryEntry,
  failedTextHistoryEntry,
} from "@/lib/parse-recipe/parse-history-entry";
import { saveDirectParseResult } from "@/lib/parse-recipe/save-direct-parse-result";
import { routes } from "@/lib/routes";
import { trackEvent } from "@/lib/telemetry";
import { useNavigate } from "@/lib/transitions";
import { generateId } from "@/lib/utils";

export type DirectParseSource = "photo" | "text";

const FAILED_HISTORY_ENTRY = {
  photo: failedPhotoHistoryEntry,
  text: failedTextHistoryEntry,
};

interface UseDirectParseOptions {
  locale: string;
  source: DirectParseSource;
  /** When provided (and still mounted), receives the recipe instead of the
   *  default queue-for-review + toast. */
  onResult?: (recipe: ParsedRecipe) => void;
}

/**
 * The client half of a photo / pasted-text import: runs the parse, records
 * history and telemetry, and hands the result to the review queue. The parse
 * keeps going if the user navigates away — the result then arrives as a toast.
 */
export function useDirectParse({
  locale,
  source,
  onResult,
}: UseDirectParseOptions) {
  const t = useTranslations("parse");
  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const startParse = useCallback(
    (parse: (jobId: string) => Promise<ParsedRecipe>) => {
      const parseJobId = generateId();
      setIsParsing(true);
      setError(null);
      trackEvent("parse_started", { source });

      parse(parseJobId)
        .then(async (recipe) => {
          if (mountedRef.current) setIsParsing(false);
          trackEvent("parse_succeeded", { source });
          recordParseHistory(
            donePhotoHistoryEntry(parseJobId, recipe.title),
          ).catch(() => {});

          // Hand off only if still on-screen; otherwise fall through to the
          // queue + toast path.
          if (onResult && mountedRef.current) {
            onResult(recipe);
            return;
          }

          try {
            await saveDirectParseResult(recipe, locale, {
              fallbackTitle: t("fallbackTitle"),
              description: t("parsedTapToReview"),
              save: t("reviewSave"),
              edit: t("reviewEdit"),
              saved: t("savedShort"),
            });
          } catch (saveError) {
            logger.error(`[${source} parse] failed to save:`, saveError);
            toast.error(t("processFailed"), {
              duration: 10000,
              closeButton: true,
            });
          }
        })
        .catch((parseError) => {
          const message =
            parseError instanceof Error
              ? parseError.message
              : t("parseFailedShort");
          trackEvent("parse_failed", {
            source,
            reason:
              parseError instanceof Error
                ? parseError.message
                : String(parseError),
          });
          recordParseHistory(
            FAILED_HISTORY_ENTRY[source](parseJobId, message),
          ).catch(() => {});
          if (mountedRef.current) {
            setIsParsing(false);
            setError(message);
          } else {
            toast.error(message, {
              duration: 10000,
              closeButton: true,
              action: {
                label: t("details"),
                onClick: () => navigate.push(routes.parseHistory(locale)),
              },
            });
          }
        });
    },
    [locale, source, onResult, navigate, t],
  );

  const stopWaiting = useCallback(() => setIsParsing(false), []);
  const clearError = useCallback(() => setError(null), []);

  return { isParsing, error, startParse, stopWaiting, clearError };
}
