"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/db/db";
import type { RecipeIngredient } from "@/lib/db/schema";

interface ServingsCalculatorProps {
  originalServings: number;
  ingredients: RecipeIngredient[];
  canonicalIngredientIds?: string[];
  locale?: string;
}

export function ServingsCalculator({
  originalServings,
  ingredients,
  canonicalIngredientIds,
  locale,
}: ServingsCalculatorProps) {
  const [servings, setServings] = useState(originalServings);
  const [canonicalNames, setCanonicalNames] = useState<Map<string, string>>(
    new Map(),
  );

  const ratio = servings / originalServings;

  useEffect(() => {
    const ids = (canonicalIngredientIds ?? []).filter(Boolean);
    if (!ids.length) return;

    db.ingredients.bulkGet(ids).then((entries) => {
      const map = new Map<string, string>();
      for (const entry of entries) {
        if (!entry) continue;
        const isUk = locale === "uk";
        const name = isUk ? (entry.ua ?? entry.en) : (entry.en ?? entry.ua);
        if (name) map.set(entry.id, name);
      }
      setCanonicalNames(map);
    });
  }, [canonicalIngredientIds, locale]);

  const formatAmount = (amount?: number) => {
    if (!amount) return null;
    const scaled = amount * ratio;
    if (Number.isInteger(scaled)) return String(scaled);
    return scaled.toFixed(1).replace(/\.0$/, "");
  };

  const displayName = (ing: RecipeIngredient, idx: number): string => {
    const canonicalId = canonicalIngredientIds?.[idx];
    if (canonicalId) {
      const name = canonicalNames.get(canonicalId);
      if (name) return name;
    }
    return ing.item;
  };

  return (
    <div className="glass-card mb-4" style={{ borderRadius: 20 }}>
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--fg-2)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 9,
          }}
        >
          Servings
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            onClick={() => setServings((s) => Math.max(1, s - 1))}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "var(--glass-card-bg)",
              border: "1px solid var(--glass-card-border)",
              backdropFilter: "blur(12px)",
              color: "var(--fg-1)",
              cursor: "pointer",
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MinusIcon style={{ width: 14, height: 14 }} />
          </button>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--fg-1)",
              minWidth: 24,
              textAlign: "center",
            }}
          >
            {servings}
          </span>
          <button
            type="button"
            onClick={() => setServings((s) => s + 1)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "var(--glass-card-bg)",
              border: "1px solid var(--glass-card-border)",
              backdropFilter: "blur(12px)",
              color: "var(--fg-1)",
              cursor: "pointer",
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PlusIcon style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      <ul>
        {ingredients.map((ing, i) => (
          <li
            key={ing.id || `ing-${i}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderBottom:
                i < ingredients.length - 1
                  ? "1px solid var(--border-subtle)"
                  : "none",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                background: "var(--food-accent)",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13, color: "var(--fg-1)" }}>
              {formatAmount(ing.amount) && (
                <span style={{ fontWeight: 600 }}>
                  {formatAmount(ing.amount)}{" "}
                </span>
              )}
              {ing.unit && <span>{ing.unit} </span>}
              {displayName(ing, i)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
