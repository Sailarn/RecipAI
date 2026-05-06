"use client";

import { useTranslations } from "next-intl";
import type { Ingredient } from "@/lib/db/schema";

interface IngredientsListProps {
  ingredients: Ingredient[];
}

export function IngredientsList({ ingredients }: IngredientsListProps) {
  const t = useTranslations("recipes");

  return (
    <div
      style={{
        background: "var(--glass-card-bg)",
        backdropFilter: "var(--glass-card-blur)",
        WebkitBackdropFilter: "var(--glass-card-blur)",
        border: "1px solid var(--glass-card-border)",
        borderRadius: 20,
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--fg-1)",
          }}
        >
          {t("ingredients")}
        </h3>
      </div>
      <ul>
        {ingredients.map((ingredient, index) => (
          <li
            key={ingredient.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderBottom:
                index === ingredients.length - 1
                  ? "none"
                  : "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                background: "#f59e0b",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13, color: "var(--fg-1)" }}>
              {ingredient.amount && (
                <span style={{ fontWeight: 600 }}>{ingredient.amount} </span>
              )}
              {ingredient.unit && `${ingredient.unit} `}
              {ingredient.item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
