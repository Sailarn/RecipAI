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
      {/* Hint text */}
      <p
        style={{
          fontSize: 12,
          color: "var(--fg-2)",
          lineHeight: 1.6,
          marginBottom: 4,
        }}
      >
        {t("hintText")}
      </p>
      <p
        style={{
          fontSize: 12,
          color: "var(--fg-3)",
          lineHeight: 1.6,
          marginBottom: 16,
        }}
      >
        {t("hintExample")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {fields.map((field, index) => (
          <div
            key={field.id}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            {/* Number chip */}
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 8,
                background: "rgba(255,180,60,0.15)",
                border: "1px solid rgba(255,200,100,0.22)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                font: "10px / 700 var(--font-sans)",
                color: "var(--fg-2)",
                flexShrink: 0,
              }}
            >
              {index + 1}
            </div>

            {/* Ingredient input */}
            <div style={{ flex: 1 }}>
              <Input
                {...register(`ingredients.${index}.item`)}
                placeholder={t("ingredientName")}
                error={!!errors.ingredients?.[index]?.item}
              />
              {errors.ingredients?.[index]?.item && (
                <p
                  style={{
                    fontSize: 11,
                    color: "rgba(239,68,68,0.85)",
                    marginTop: 4,
                    paddingLeft: 2,
                  }}
                >
                  {errors.ingredients[index]?.item?.message}
                </p>
              )}
            </div>

            {/* Remove button */}
            {fields.length > 1 && (
              <button
                type="button"
                onClick={() => remove(index)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: "rgba(239,68,68,0.10)",
                  border: "1px solid rgba(239,68,68,0.20)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <X size={13} style={{ color: "var(--action-destructive)" }} />
              </button>
            )}
          </div>
        ))}
      </div>

      {errors.ingredients && (
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

      {/* Add ingredient dashed button */}
      <button
        type="button"
        onClick={() => append({ item: "", amount: "1", unit: "" })}
        style={{
          marginTop: 4,
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
