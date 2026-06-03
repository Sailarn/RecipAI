"use client";

import { Clock, Hourglass, Timer } from "lucide-react";
import { useTranslations } from "next-intl";

interface RecipeMetaProps {
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
}

const iconClass = "w-3 h-3 shrink-0 text-[var(--fg-2)]";

const iconMap: Record<string, React.ReactNode> = {
  prepTime: <Clock className={iconClass} />,
  cookTime: <Timer className={iconClass} />,
  totalTime: <Hourglass className={iconClass} />,
};

export function RecipeMeta({ prepTime, cookTime, totalTime }: RecipeMetaProps) {
  const tCommon = useTranslations("common");
  const t = useTranslations("recipes");

  const items = [
    prepTime
      ? {
          key: "prepTime",
          label: t("prepTime"),
          value: `${prepTime} ${tCommon("minutes")}`,
        }
      : null,
    cookTime
      ? {
          key: "cookTime",
          label: t("cookTime"),
          value: `${cookTime} ${tCommon("minutes")}`,
        }
      : null,
    totalTime
      ? {
          key: "totalTime",
          label: t("totalTime"),
          value: `${totalTime} ${tCommon("minutes")}`,
        }
      : null,
  ].filter(Boolean) as { key: string; label: string; value: string }[];

  if (items.length === 0) return null;

  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-[5px] text-[11px] text-[var(--fg-2)] bg-[var(--glass-card-bg)] [backdrop-filter:var(--glass-card-blur)] [-webkit-backdrop-filter:var(--glass-card-blur)] border border-[var(--glass-card-border)] rounded-[20px] px-[10px] py-[5px]"
        >
          {iconMap[item.key]}
          <span className="font-semibold text-[var(--fg-1)]">{item.label}</span>
          <span>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
