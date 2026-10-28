"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { parseMessageKey } from "@/lib/parse-recipe/parse-message-key";

/**
 * Translates a parse message stored or sent in English (a failure reason, a
 * "Photo import" title). Text it doesn't recognise — a recipe title, an
 * already-translated message — is returned unchanged.
 */
export function useParseMessage(): (text: string) => string {
  const t = useTranslations("parse.messages");
  return useCallback(
    (text: string) => {
      const key = parseMessageKey(text);
      return key ? t(key) : text;
    },
    [t],
  );
}
