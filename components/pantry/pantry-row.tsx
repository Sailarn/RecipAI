import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { removePantryItem, togglePantryItem } from "@/lib/db/pantry";
import type { PantryItem } from "@/lib/db/schema";
import { trackEvent } from "@/lib/telemetry";

export function PantryRow({ item, name }: { item: PantryItem; name: string }) {
  const t = useTranslations("pantry");
  return (
    <div className="flex items-center gap-3 py-3 px-4 border-b border-[rgba(255,200,100,0.08)]">
      {/* Checkbox toggle */}
      <button
        type="button"
        data-testid={`toggle-${item.id}`}
        onClick={() => {
          trackEvent("pantry_item_toggled", { have: !item.on });
          togglePantryItem(item.id);
        }}
        aria-label={item.on ? t("markOutOfStock") : t("markInStock")}
        className={`w-[22px] h-[22px] rounded-md border-2 shrink-0 cursor-pointer flex items-center justify-center text-[13px] transition-all duration-150 ${
          item.on
            ? "border-[rgba(251,191,36,0.8)] bg-[rgba(251,191,36,0.2)]"
            : "border-[rgba(255,200,100,0.3)] bg-transparent"
        }`}
      >
        {item.on ? "✓" : ""}
      </button>

      {/* Name + category */}
      <div className="flex-1 min-w-0">
        <div
          className={`font-sans text-[15px] font-medium overflow-hidden text-ellipsis whitespace-nowrap ${
            item.on ? "text-[var(--fg-1)]" : "text-[var(--fg-3)] line-through"
          }`}
        >
          {name}
        </div>
      </div>

      {/* Delete button */}
      <button
        type="button"
        data-testid={`delete-${item.id}`}
        onClick={async () => {
          await removePantryItem(item.id);
          toast.success(t("removed", { name }));
        }}
        aria-label={`Remove ${name}`}
        className="w-7 h-7 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] text-[var(--action-destructive)] cursor-pointer text-sm flex items-center justify-center shrink-0"
      >
        ×
      </button>
    </div>
  );
}
