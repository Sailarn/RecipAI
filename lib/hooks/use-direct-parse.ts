"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { recordParseHistory } from "@/lib/db/parse-history";
import { saveParsedResult } from "@/lib/db/save-parsed-recipe";
import type { ParsedRecipe } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import {
  announceFailedParse,
  announceSavedParse,
  type SavedParse,
} from "@/lib/parse-recipe/announce-parse";
import {
  doneImportHistoryEntry,
  failedPhotoHistoryEntry,
  failedTextHistoryEntry,
} from "@/lib/parse-recipe/parse-history-entry";
import { routes } from "@/lib/routes";
import { trackEvent } from "@/lib/telemetry";
import { useNavigate } from "@/lib/transitions";
import { generateId } from "@/lib/utils";

type DirectParseSource = "photo" | "text";

const FAILED_HISTORY_ENTRY = {
  photo: failedPhotoHistoryEntry,
  text: failedTextHistoryEntry,
};

interface UseDirectParseOptions {
  locale: string;
  source: DirectParseSource;
}

/**
 * The client half of a photo / pasted-text import: runs the parse, saves the
 * recipe into the library, records history and telemetry, and announces it.
 * The parse keeps going if the user navigates away — the result then arrives
 * as a toast and a bell entry.
 */
export function useDirectParse({ locale, source }: UseDirectParseOptions) {
  const t = useTranslations("parse");
  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedParse | null>(null);

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
      setSaved(null);
      trackEvent("parse_started", { source });

      parse(parseJobId)
        .then(async (parsed) => {
          if (mountedRef.current) setIsParsing(false);
          trackEvent("parse_succeeded", { source });
          recordParseHistory(
            doneImportHistoryEntry(parseJobId, parsed.title),
          ).catch(() => {});

          // A photo or pasted text has no page to link back to, even if the
          // model echoed a URL it saw in the text.
          const recipe: ParsedRecipe = { ...parsed, sourceUrl: "" };
          try {
            const savedRef = await saveParsedResult(recipe);
            announceSavedParse({
              jobId: parseJobId,
              recipe,
              ...savedRef,
              labels: {
                added: t("addedToRecipes"),
                alreadySaved: t("alreadySaved"),
              },
            });
            if (mountedRef.current) setSaved({ ...savedRef, recipe });
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
          const historyEntry = FAILED_HISTORY_ENTRY[source](
            parseJobId,
            message,
          );
          recordParseHistory(historyEntry).catch(() => {});
          announceFailedParse({
            jobId: parseJobId,
            title: historyEntry.title,
            reason: historyEntry.reason ?? message,
          });
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
    [locale, source, navigate, t],
  );

  const stopWaiting = useCallback(() => setIsParsing(false), []);
  const clearError = useCallback(() => setError(null), []);
  const clearSaved = useCallback(() => setSaved(null), []);

  return {
    isParsing,
    error,
    saved,
    startParse,
    stopWaiting,
    clearError,
    clearSaved,
  };
}
