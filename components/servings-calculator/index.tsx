"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { MinusIcon, PlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/db/db";
import { createProvisionalIngredient } from "@/lib/db/ingredients";
import { addPantryItem, togglePantryItem } from "@/lib/db/pantry";
import type { PantryItem, RecipeIngredient } from "@/lib/db/schema";

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
  const [useCanonical, setUseCanonical] = useState(true);
  const [canonicalNames, setCanonicalNames] = useState<Map<string, string>>(
    new Map(),
  );
  const hasCanonical = (canonicalIngredientIds ?? []).length > 0;

  const pantryItems = useLiveQuery(() => db.pantry.toArray(), []);

  // All pantry items keyed by vocab ingredientId (for canonical-ID lookup)
  const pantryByIngredientId = useMemo(
    () =>
      new Map<string, PantryItem>(
        (pantryItems ?? [])
          .filter(
            (p): p is PantryItem & { ingredientId: string } =>
              typeof p.ingredientId === "string",
          )
          .map((p) => [p.ingredientId, p]),
      ),
    [pantryItems],
  );

  // Fallback lookup by name for unknown/provisional ingredients
  const pantryByName = useMemo(
    () =>
      new Map<string, PantryItem>(
        (pantryItems ?? []).map((p) => [p.name.toLowerCase(), p]),
      ),
    [pantryItems],
  );

  // Only on:true IDs — used for the green dot
  const pantrySet = useMemo(
    () =>
      new Set<string>(
        [...pantryByIngredientId.values()]
          .filter((p) => p.on)
          .map((p) => p.ingredientId as string),
      ),
    [pantryByIngredientId],
  );

  const ratio = servings / originalServings;

  useEffect(() => {
    const ids = (canonicalIngredientIds ?? []).filter(Boolean);
    if (!ids.length) return;

    db.ingredients.bulkGet(ids).then((entries) => {
      const map = new Map<string, string>();
      for (const entry of entries) {
        if (!entry) continue;
        const isUk = locale === "ua";
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

  // "in" | "out" | "unknown"
  const stockStatus = (idx: number): "in" | "out" | "unknown" => {
    const id = canonicalIngredientIds?.[idx];
    if (!id) return "unknown";
    return pantrySet.has(id) ? "in" : "out";
  };

  const displayName = (ing: RecipeIngredient, idx: number): string => {
    if (useCanonical) {
      const canonicalId = canonicalIngredientIds?.[idx];
      if (canonicalId) {
        const name = canonicalNames.get(canonicalId);
        if (name) return name;
      }
    }
    return ing.item;
  };

  // Returns the pantry item for this ingredient row, or undefined if not tracked
  function pantryItemFor(
    ing: RecipeIngredient,
    idx: number,
  ): PantryItem | undefined {
    const id = canonicalIngredientIds?.[idx];
    if (id) return pantryByIngredientId.get(id);
    return pantryByName.get(ing.item.toLowerCase());
  }

  async function addToPantry(ing: RecipeIngredient, idx: number) {
    const canonicalId = canonicalIngredientIds?.[idx];
    const name = displayName(ing, idx);

    let ingredientId = canonicalId;
    if (!ingredientId) {
      // No vocab entry yet — create provisional, Gemini enriches in background
      ingredientId = await createProvisionalIngredient(ing.item);
    }

    await addPantryItem({
      name,
      qty: 1,
      unit: "pcs",
      cat: "Other",
      on: true,
      ingredientId,
    });
  }

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
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 9,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--fg-2)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Servings
          </span>
          {hasCanonical && (
            <div
              style={{
                display: "flex",
                borderRadius: 8,
                border: "1px solid var(--border-subtle)",
                overflow: "hidden",
              }}
            >
              {(["parsed", "original"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setUseCanonical(mode === "parsed")}
                  style={{
                    padding: "3px 9px",
                    fontSize: 10,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background:
                      (mode === "parsed") === useCanonical
                        ? "var(--food-accent)"
                        : "transparent",
                    color:
                      (mode === "parsed") === useCanonical
                        ? "#fff"
                        : "var(--fg-3)",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          )}
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
        {ingredients.map((ing, i) => {
          const status = stockStatus(i);
          const bulletColor =
            status === "in"
              ? "rgba(34,197,94,0.9)"
              : status === "out"
                ? "rgba(239,68,68,0.7)"
                : "var(--food-accent)";
          const textOpacity = status === "out" ? 0.45 : 1;
          const pantryItem = pantryItemFor(ing, i);

          return (
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
                  background: bulletColor,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: "var(--fg-1)",
                  opacity: textOpacity,
                  transition: "opacity 0.2s",
                }}
              >
                {formatAmount(ing.amount) && (
                  <span style={{ fontWeight: 600 }}>
                    {formatAmount(ing.amount)}{" "}
                  </span>
                )}
                {ing.unit && <span>{ing.unit} </span>}
                {displayName(ing, i)}
              </span>

              {pantryItem ? (
                // Already in pantry — show checkbox to toggle in/out of stock
                <button
                  type="button"
                  onClick={() => togglePantryItem(pantryItem.id)}
                  aria-label={
                    pantryItem.on ? "Mark as out of stock" : "Mark as in stock"
                  }
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: `2px solid ${pantryItem.on ? "rgba(251,191,36,0.8)" : "rgba(255,200,100,0.28)"}`,
                    background: pantryItem.on
                      ? "rgba(251,191,36,0.18)"
                      : "transparent",
                    flexShrink: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    color: "rgba(251,191,36,0.9)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {pantryItem.on ? "✓" : ""}
                </button>
              ) : (
                // Not in pantry — add button
                <button
                  type="button"
                  onClick={() => addToPantry(ing, i)}
                  aria-label={`Add ${displayName(ing, i)} to pantry`}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: "1px solid rgba(255,200,100,0.25)",
                    background: "rgba(255,200,100,0.06)",
                    flexShrink: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,200,100,0.6)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <PlusIcon style={{ width: 11, height: 11 }} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
