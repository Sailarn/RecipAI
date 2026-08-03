"use client";

import { ClipboardPaste, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";

interface UrlFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onPaste: () => void;
  canPaste: boolean;
  isPasting: boolean;
  disabled: boolean;
}

const ACTION_CLASSES =
  "grid size-7 place-items-center rounded-full text-[var(--fg-2)] transition-colors hover:text-[var(--fg-1)] disabled:opacity-50 disabled:cursor-not-allowed";

export function UrlField({
  value,
  onChange,
  onSubmit,
  onPaste,
  canPaste,
  isPasting,
  disabled,
}: UrlFieldProps) {
  const t = useTranslations("parse.url");

  // Only one of the two ever shows: an empty field offers Paste, a filled one
  // offers Clear. Both occupy the same slot, so the text never reflows.
  const showClear = value.length > 0;
  const showPaste = !showClear && canPaste;

  return (
    <div className="relative">
      <Input
        id="url"
        type="url"
        placeholder="https://silpo.ua/recipes/..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && onSubmit()}
        disabled={disabled}
        className={showClear || showPaste ? "pr-11" : ""}
      />

      <div className="absolute inset-y-0 right-2 flex items-center">
        {showClear && (
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={disabled}
            aria-label={t("clear")}
            className={ACTION_CLASSES}
          >
            <X width={16} height={16} />
          </button>
        )}
        {showPaste && (
          <button
            type="button"
            onClick={onPaste}
            disabled={disabled || isPasting}
            aria-label={t("paste")}
            className={ACTION_CLASSES}
          >
            {isPasting ? (
              <Loader2 width={16} height={16} className="animate-spin" />
            ) : (
              <ClipboardPaste width={16} height={16} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
