"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  useFieldArray,
} from "react-hook-form";
import { Input } from "@/components/ui";
import type { RecipeFormData } from "./schema";

interface IngredientsSectionProps {
  register: UseFormRegister<RecipeFormData>;
  control: Control<RecipeFormData>;
  errors: FieldErrors<RecipeFormData>;
}

const QTY_W = 56;
const UNIT_W = 68;
const REMOVE_W = 32;
const COL_GAP = 6;
const ERROR_H = 16;

const colLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  fontFamily: "var(--font-sans)",
  color: "var(--fg-3)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  paddingLeft: 3,
};

export function IngredientsSection({
  register,
  control,
  errors,
}: IngredientsSectionProps) {
  const t = useTranslations("recipeForm");
  const { fields, append, remove } = useFieldArray({
    control,
    name: "ingredients",
  });

  return (
    <div>
      {/* Header: hint + count badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 4,
        }}
      >
        <p style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.6 }}>
          {t("hintText")}
        </p>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "var(--font-sans)",
            color: "rgba(255,180,60,0.9)",
            background: "rgba(255,180,60,0.12)",
            border: "1px solid rgba(255,200,100,0.22)",
            borderRadius: 99,
            padding: "2px 8px",
            flexShrink: 0,
            marginLeft: 8,
          }}
        >
          {fields.length}
        </span>
      </div>
      <p
        style={{
          fontSize: 12,
          color: "var(--fg-3)",
          lineHeight: 1.6,
          marginBottom: 10,
        }}
      >
        {t("hintExample")}
      </p>

      {/* Column labels — always visible, aligned to inputs below */}
      <div style={{ display: "flex", gap: COL_GAP, marginBottom: 4 }}>
        <div style={{ ...colLabel, width: QTY_W, flexShrink: 0 }}>Qty</div>
        <div style={{ ...colLabel, width: UNIT_W, flexShrink: 0 }}>Unit</div>
        <div style={{ ...colLabel, flex: 1, minWidth: 0 }}>Ingredient</div>
        {/* spacer matches remove button — keeps labels aligned even when button hides */}
        <div style={{ width: REMOVE_W, flexShrink: 0 }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {fields.map((field, index) => {
          const amountErr = errors.ingredients?.[index]?.amount;
          const itemErr = errors.ingredients?.[index]?.item;

          return (
            <div
              key={field.id}
              style={{ display: "flex", gap: COL_GAP, alignItems: "flex-start" }}
            >
              {/* Amount — no placeholder: column header provides context */}
              <div style={{ width: QTY_W, flexShrink: 0 }}>
                <Input
                  {...register(`ingredients.${index}.amount`)}
                  type="text"
                  inputMode="decimal"
                  error={!!amountErr}
                />
                <p
                  style={{
                    fontSize: 10,
                    color: "rgba(239,68,68,0.85)",
                    marginTop: 3,
                    paddingLeft: 2,
                    minHeight: ERROR_H,
                    lineHeight: 1.3,
                    visibility: amountErr ? "visible" : "hidden",
                  }}
                >
                  {amountErr?.message ?? " "}
                </p>
              </div>

              {/* Unit */}
              <div style={{ width: UNIT_W, flexShrink: 0 }}>
                <Input
                  {...register(`ingredients.${index}.unit`)}
                  placeholder={t("unit")}
                />
                {/* spacer keeps this column height in sync with error rows */}
                <div style={{ minHeight: ERROR_H, marginTop: 3 }} />
              </div>

              {/* Ingredient name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Input
                  {...register(`ingredients.${index}.item`)}
                  placeholder={t("ingredientName")}
                  error={!!itemErr}
                />
                <p
                  style={{
                    fontSize: 10,
                    color: "rgba(239,68,68,0.85)",
                    marginTop: 3,
                    paddingLeft: 2,
                    minHeight: ERROR_H,
                    lineHeight: 1.3,
                    visibility: itemErr ? "visible" : "hidden",
                  }}
                >
                  {itemErr?.message ?? " "}
                </p>
              </div>

              {/* Remove — always takes space, invisible when only 1 row */}
              <button
                type="button"
                onClick={() => remove(index)}
                style={{
                  width: REMOVE_W,
                  height: 36,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: "rgba(239,68,68,0.10)",
                  border: "1px solid rgba(239,68,68,0.20)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  visibility: fields.length > 1 ? "visible" : "hidden",
                }}
              >
                <X size={13} style={{ color: "var(--action-destructive)" }} />
              </button>
            </div>
          );
        })}
      </div>

      {errors.ingredients?.message && (
        <p
          style={{
            fontSize: 11,
            color: "rgba(239,68,68,0.85)",
            marginTop: 4,
            paddingLeft: 2,
          }}
        >
          {errors.ingredients.message}
        </p>
      )}

      {/* Add ingredient */}
      <button
        type="button"
        onClick={() => append({ item: "", amount: "", unit: "" })}
        style={{
          marginTop: 6,
          padding: 10,
          borderRadius: 14,
          maxHeight: 37.5,
          border: "1px dashed rgba(255,200,100,0.25)",
          background: "rgba(255,170,50,0.05)",
          font: "13px / 500 var(--font-sans)",
          color: "var(--fg-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          cursor: "pointer",
          width: "100%",
          transition: "all 0.15s ease",
        }}
      >
        <Plus size={14} style={{ color: "var(--fg-2)" }} />
        {t("addIngredient")}
      </button>
    </div>
  );
}
