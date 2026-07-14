"use client";

import { PlusIcon } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { togglePantryItem } from "@/lib/db/pantry";
import type { PantryItem, RecipeIngredient } from "@/lib/db/schema";
import { modifierLabel } from "@/lib/parse-recipe/modifiers";
import { cn } from "@/lib/utils";
import type { StockStatus } from "./use-servings-calculator";

const BULLET_COLOR: Record<StockStatus, string> = {
  in: "rgba(34,197,94,0.9)",
  out: "rgba(239,68,68,0.7)",
  unknown: "var(--food-accent)",
};

interface IngredientRowProps {
  ingredient: RecipeIngredient;
  isLast: boolean;
  scaledAmount: string | null;
  status: StockStatus;
  name: string;
  locale: Locale;
  showOriginal: boolean;
  pantryItem: PantryItem | undefined;
  onAdd: () => Promise<void>;
}

export function IngredientRow({
  ingredient,
  isLast,
  scaledAmount,
  status,
  name,
  locale,
  showOriginal,
  pantryItem,
  onAdd,
}: IngredientRowProps) {
  return (
    <li
      className={cn(
        "flex items-center gap-[10px] px-[14px] py-[10px]",
        !isLast && "border-b border-b-[var(--border-subtle)]",
      )}
    >
      <div
        data-status={status}
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: BULLET_COLOR[status] }}
      />
      <span
        className="flex-1 flex flex-col gap-0.5 text-[13px] text-[var(--fg-1)] transition-[opacity] duration-200"
        style={{ opacity: status === "out" ? 0.45 : 1 }}
      >
        <span>
          {scaledAmount && (
            <span className="font-semibold">{scaledAmount} </span>
          )}
          {ingredient.unit && <span>{ingredient.unit} </span>}
          {name}
          {ingredient.modifiers?.map((modifier) => (
            <span
              key={modifier}
              className="ml-2 inline-flex items-center rounded-full bg-[color-mix(in_oklch,var(--food-accent)_13%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--food-accent)]"
            >
              {modifierLabel(modifier, locale)}
            </span>
          ))}
        </span>
        {showOriginal &&
          ingredient.original &&
          ingredient.original !== name && (
            <span className="text-[11px] text-[var(--fg-2)]">
              {ingredient.original}
            </span>
          )}
      </span>

      {pantryItem ? (
        <button
          type="button"
          onClick={() => togglePantryItem(pantryItem.id)}
          aria-label={
            pantryItem.on ? "Mark as out of stock" : "Mark as in stock"
          }
          className={cn(
            "w-[22px] h-[22px] rounded-[6px] shrink-0 cursor-pointer flex items-center justify-center text-[11px] text-[rgba(251,191,36,0.9)] transition-all duration-150 ease",
            pantryItem.on
              ? "border-2 border-[rgba(251,191,36,0.8)] bg-[rgba(251,191,36,0.18)]"
              : "border-2 border-[rgba(255,200,100,0.28)] bg-transparent",
          )}
        >
          {pantryItem.on ? "✓" : ""}
        </button>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add ${name} to pantry`}
          className="w-[22px] h-[22px] rounded-[6px] border border-[rgba(255,200,100,0.25)] bg-[rgba(255,200,100,0.06)] shrink-0 cursor-pointer flex items-center justify-center text-[rgba(255,200,100,0.6)] transition-all duration-150 ease"
        >
          <PlusIcon size={11} />
        </button>
      )}
    </li>
  );
}
