"use client";

import { Link2, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface ClipboardSuggestionProps {
  link: string;
  onAccept: () => void;
  onDismiss: () => void;
}

export function ClipboardSuggestion({
  link,
  onAccept,
  onDismiss,
}: ClipboardSuggestionProps) {
  const t = useTranslations("parse.url");

  return (
    <div className="glass-card flex items-center gap-2 rounded-[14px] px-3 py-2">
      <Link2
        width={15}
        height={15}
        className="shrink-0 text-[var(--fg-2)]"
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={onAccept}
        className="min-w-0 flex-1 text-left cursor-pointer"
      >
        <span className="block font-sans text-[12px] text-[var(--fg-2)]">
          {t("suggestion")}
        </span>
        <span className="block truncate font-sans text-[13px] text-[var(--fg-1)]">
          {link}
        </span>
      </button>

      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("dismissSuggestion")}
        className="grid size-7 shrink-0 place-items-center rounded-full text-[var(--fg-2)] transition-colors hover:text-[var(--fg-1)]"
      >
        <X width={15} height={15} />
      </button>
    </div>
  );
}
