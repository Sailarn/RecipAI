import { Check, X } from "lucide-react";
import type { Locale } from "@/i18n/config";
import {
  modifierLabel,
  PREPARATION_MODIFIERS,
  type PreparationModifier,
} from "@/lib/parse-recipe/modifiers";
import { cn } from "@/lib/utils";

interface AdditivePickerProps {
  id: string;
  modifiers: PreparationModifier[];
  locale: Locale;
  title: string;
  closeLabel: string;
  onClose: () => void;
  onToggle: (modifier: PreparationModifier) => void;
}

const modifierKeys = Object.keys(
  PREPARATION_MODIFIERS,
) as PreparationModifier[];

export function AdditivePicker({
  id,
  modifiers,
  locale,
  title,
  closeLabel,
  onClose,
  onToggle,
}: AdditivePickerProps) {
  const titleId = `${id}-title`;

  return (
    <fieldset
      id={id}
      aria-labelledby={titleId}
      className="mt-2 rounded-[18px] border border-[rgba(255,200,100,0.22)] bg-[rgba(255,170,50,0.05)] p-[13px]"
    >
      <legend
        id={titleId}
        className="float-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-3)]"
      >
        {title}
      </legend>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          className="flex size-[26px] shrink-0 items-center justify-center rounded-[8px] border border-[rgba(255,200,100,0.2)] text-[var(--fg-2)]"
        >
          <X size={13} />
        </button>
      </div>
      <div className="flex flex-wrap gap-[7px]">
        {modifierKeys.map((modifier) => {
          const isApplied = modifiers.includes(modifier);

          return (
            <button
              key={modifier}
              type="button"
              data-testid={`additive-option-${modifier}`}
              aria-pressed={isApplied}
              onClick={() => onToggle(modifier)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-[10px] py-[5px] text-[12.5px] font-semibold transition-colors",
                isApplied
                  ? "border-[rgba(74,222,128,0.5)] bg-[rgba(74,222,128,0.16)] text-[rgba(74,222,128,0.98)]"
                  : "border-[rgba(251,146,60,0.38)] bg-[rgba(251,146,60,0.1)] text-[rgba(251,146,60,0.95)]",
              )}
            >
              {isApplied && <Check size={12} />}
              {modifierLabel(modifier, locale)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
