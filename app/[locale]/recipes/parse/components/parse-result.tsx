"use client";

import type { ParsedRecipe } from "../page";

interface ParseResultProps {
  result: ParsedRecipe;
  onSave: () => void;
  onReset: () => void;
}

const CATEGORY_STYLE: Record<
  string,
  { grad: string; emoji: string; bg: string; color: string }
> = {
  Breakfast: { grad: "linear-gradient(160deg, #7c3a00, #3d1800)", emoji: "🍳", bg: "rgba(232,89,12,0.22)",  color: "#fdba74" },
  Lunch:     { grad: "linear-gradient(160deg, #064e3b, #052e16)", emoji: "🥗", bg: "rgba(47,158,68,0.22)",  color: "#86efac" },
  Dinner:    { grad: "linear-gradient(160deg, #1e1b4b, #0f172a)", emoji: "🍽️", bg: "rgba(59,91,219,0.22)",  color: "#93c5fd" },
  Soup:      { grad: "linear-gradient(160deg, #7c2d12, #431407)", emoji: "🍲", bg: "rgba(234,88,12,0.22)",  color: "#fb923c" },
  Salad:     { grad: "linear-gradient(160deg, #14532d, #0a2512)", emoji: "🥗", bg: "rgba(47,158,68,0.22)",  color: "#86efac" },
  Snack:     { grad: "linear-gradient(160deg, #2e1065, #0f0a1e)", emoji: "🍿", bg: "rgba(139,92,246,0.22)", color: "#c4b5fd" },
  Dessert:   { grad: "linear-gradient(160deg, #4a0020, #1e0010)", emoji: "🍰", bg: "rgba(194,37,92,0.22)",  color: "#f9a8d4" },
  Baking:    { grad: "linear-gradient(160deg, #713f12, #3d2105)", emoji: "🍞", bg: "rgba(234,179,8,0.22)",  color: "#fde047" },
  Drink:     { grad: "linear-gradient(160deg, #0c4a6e, #042f4b)", emoji: "🥤", bg: "rgba(6,182,212,0.22)",  color: "#67e8f9" },
  Other:     { grad: "linear-gradient(160deg, #1c1c2e, #0f0f1a)", emoji: "🍴", bg: "rgba(100,100,110,0.22)",color: "#d4d4d8" },
};

const DEFAULT_STYLE = CATEGORY_STYLE.Other;

export function ParseResult({ result, onSave, onReset }: ParseResultProps) {
  const cat = result.category ? (CATEGORY_STYLE[result.category] ?? DEFAULT_STYLE) : DEFAULT_STYLE;

  const metaParts: string[] = [];
  if (result.servings) metaParts.push(`🍽️ ${result.servings} servings`);
  if (result.prepTime || result.cookTime) {
    const total = (result.prepTime ?? 0) + (result.cookTime ?? 0);
    metaParts.push(`⏱ ${total}m`);
  }

  return (
    <div
      className="glass-card"
      style={{ borderRadius: 20, marginTop: 16, overflow: "hidden" }}
    >
      {/* Gradient image strip */}
      <div
        style={{
          height: 80,
          background: cat.grad,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
          flexShrink: 0,
        }}
      >
        {cat.emoji}
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px" }}>
        {/* Title row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 5,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--fg-1)",
              flex: 1,
              marginRight: 8,
            }}
          >
            {result.title}
          </p>
          {result.category && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 99,
                background: cat.bg,
                color: cat.color,
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: `1px solid ${cat.color}30`,
                flexShrink: 0,
              }}
            >
              {result.category}
            </span>
          )}
        </div>

        {/* Meta */}
        {metaParts.length > 0 && (
          <p
            style={{
              fontSize: 11,
              color: "var(--fg-2)",
              marginBottom: 12,
            }}
          >
            {metaParts.join(" · ")}
          </p>
        )}

        {/* Ingredients preview */}
        {result.ingredients.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--fg-3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Ingredients ({result.ingredients.length})
            </p>
            <ul style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {result.ingredients.slice(0, 4).map((ing) => (
                <li
                  key={`${ing.item}-${ing.amount}-${ing.unit}`}
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "baseline",
                    fontSize: 12,
                    color: "var(--fg-1)",
                  }}
                >
                  <span style={{ color: "var(--food-accent)", fontSize: 6, marginTop: 2 }}>●</span>
                  <span>
                    {ing.amount && `${ing.amount} `}
                    {ing.unit && `${ing.unit} `}
                    {ing.item}
                  </span>
                </li>
              ))}
              {result.ingredients.length > 4 && (
                <li style={{ fontSize: 11, color: "var(--fg-3)" }}>
                  +{result.ingredients.length - 4} more
                </li>
              )}
            </ul>
          </div>
        )}

        {result.instructions.length > 0 && (
          <p style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 12 }}>
            {result.instructions.length} steps
          </p>
        )}

        {/* Save button */}
        <button
          type="button"
          onClick={onSave}
          style={{
            width: "100%",
            padding: 10,
            background: "var(--action-primary)",
            color: "#fff",
            borderRadius: 13,
            border: "none",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(59,130,246,0.4)",
            marginBottom: 8,
          }}
        >
          Edit &amp; Save Recipe
        </button>

        <button
          type="button"
          onClick={onReset}
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "rgba(255,170,50,0.08)",
            color: "var(--fg-2)",
            borderRadius: 13,
            border: "1px solid rgba(255,200,100,0.18)",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Parse Another
        </button>
      </div>
    </div>
  );
}
