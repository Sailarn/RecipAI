"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { AiButton } from "@/components/ui/ai-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useClipboardLink } from "@/lib/hooks/use-clipboard-link";
import { ClipboardSuggestion } from "./clipboard-suggestion";
import { UrlField } from "./url-field";

interface ParseFormProps {
  url: string;
  onUrlChange: (value: string) => void;
  loading: boolean;
  error: string | null;
  onSubmit: () => void;
}

const LABEL_CLASSES =
  "block font-sans text-[12px] font-medium text-[var(--fg-2)]";

export function ParseForm({
  url,
  onUrlChange,
  loading,
  error,
  onSubmit,
}: ParseFormProps) {
  const t = useTranslations("parse.url");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const { canPaste, isReading, pasteLink, suggestion, dismissSuggestion } =
    useClipboardLink({ enabled: url.length === 0 && !loading });

  const handlePaste = useCallback(() => {
    setPasteError(null);
    pasteLink()
      .then((link) => {
        if (link) {
          onUrlChange(link);
          dismissSuggestion();
        } else {
          setPasteError(t("pasteEmpty"));
        }
      })
      .catch((caughtError) => {
        setPasteError(t("pasteEmpty"));
        throw caughtError;
      });
  }, [pasteLink, onUrlChange, dismissSuggestion, t]);

  const handleAcceptSuggestion = useCallback(() => {
    if (suggestion) onUrlChange(suggestion);
    dismissSuggestion();
  }, [suggestion, onUrlChange, dismissSuggestion]);

  const handleUrlChange = useCallback(
    (value: string) => {
      setPasteError(null);
      onUrlChange(value);
    },
    [onUrlChange],
  );

  return (
    <div className="space-y-4 mb-6">
      <div className="space-y-2">
        <label htmlFor="url" className={LABEL_CLASSES}>
          {t("label")}
        </label>
        <UrlField
          value={url}
          onChange={handleUrlChange}
          onSubmit={onSubmit}
          onPaste={handlePaste}
          canPaste={canPaste}
          isPasting={isReading}
          disabled={loading}
        />
        {suggestion && !loading && (
          <ClipboardSuggestion
            link={suggestion}
            onAccept={handleAcceptSuggestion}
            onDismiss={dismissSuggestion}
          />
        )}
        {pasteError && (
          <p className="font-sans text-[12px] text-[var(--fg-2)]">
            {pasteError}
          </p>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <AiButton
        onClick={onSubmit}
        disabled={!url}
        loading={loading}
        label={t("submit")}
        loadingLabel={t("submitting")}
      />
    </div>
  );
}
