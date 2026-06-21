import { Check, Plus } from "lucide-react";
import type { CategoryStyle } from "./category-styles";

interface IngredientTileProps {
  displayName: string;
  categoryStyle: CategoryStyle;
  isAdded: boolean;
  isSelected: boolean;
  onToggle: () => void;
}

export function IngredientTile({
  displayName,
  categoryStyle,
  isAdded,
  isSelected,
  onToggle,
}: IngredientTileProps) {
  const tileState = isAdded ? "added" : isSelected ? "selected" : "default";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isAdded}
      data-state={tileState}
      aria-pressed={isAdded || isSelected}
      className={`min-h-[50px] w-full rounded-[14px] px-[13px] py-3 flex items-center gap-[9px] font-sans text-sm font-medium text-left transition-all border-[1.5px] ${
        isAdded
          ? "bg-[var(--glass-card-bg)] border-[var(--glass-card-border)] text-[var(--fg-1)] cursor-default"
          : isSelected
            ? `${categoryStyle.selectedTile} text-[var(--fg-1)] cursor-pointer`
            : "bg-[var(--glass-card-bg)] border-[var(--glass-card-border)] text-[var(--fg-1)] cursor-pointer"
      }`}
    >
      <span
        className={`size-6 rounded-full shrink-0 flex items-center justify-center border-[1.5px] ${
          isSelected || isAdded
            ? categoryStyle.selectedControl
            : "bg-transparent border-[var(--fg-3)]"
        }`}
      >
        {isSelected || isAdded ? (
          <Check size={13} strokeWidth={3} className="text-[#080808]" />
        ) : (
          <Plus size={13} strokeWidth={2.2} className="text-[var(--fg-2)]" />
        )}
      </span>
      <span className="flex-1 leading-[1.15]">{displayName}</span>
    </button>
  );
}
