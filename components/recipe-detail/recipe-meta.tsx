"use client";

import { Clock, Hourglass, Timer } from "lucide-react";
import { useTranslations } from "next-intl";

interface RecipeMetaProps {
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
}

const iconMap: Record<string, React.ReactNode> = {
  prepTime: (
    <Clock
      style={{ width: 12, height: 12, flexShrink: 0, color: "var(--fg-2)" }}
    />
  ),
  cookTime: (
    <Timer
      style={{ width: 12, height: 12, flexShrink: 0, color: "var(--fg-2)" }}
    />
  ),
  totalTime: (
    <Hourglass
      style={{ width: 12, height: 12, flexShrink: 0, color: "var(--fg-2)" }}
    />
  ),
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
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            color: "var(--fg-2)",
            background: "var(--glass-card-bg)",
            backdropFilter: "var(--glass-card-blur)",
            WebkitBackdropFilter: "var(--glass-card-blur)",
            border: "1px solid var(--glass-card-border)",
            borderRadius: 20,
            padding: "5px 10px",
          }}
        >
          {iconMap[item.key]}
          <span style={{ fontWeight: 600, color: "var(--fg-1)" }}>
            {item.label}
          </span>
          <span>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
