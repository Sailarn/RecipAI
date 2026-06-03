"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type Control,
  Controller,
  type FieldErrors,
  type UseFormRegister,
  useFieldArray,
} from "react-hook-form";
import { IngredientAutocomplete } from "@/components/ingredient-autocomplete";
import { Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { RecipeFormData } from "./schema";

interface IngredientsSectionProps {
  register: UseFormRegister<RecipeFormData>;
  control: Control<RecipeFormData>;
  errors: FieldErrors<RecipeFormData>;
}

const colLabelClass =
  "text-[10px] font-semibold font-[family-name:var(--font-sans)] text-[var(--fg-3)] uppercase tracking-[0.06em] pl-[3px]";
const errorRowClass =
  "text-[10px] text-[rgba(239,68,68,0.85)] mt-[3px] pl-[2px] min-h-4 leading-[1.3]";

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
      <div className="flex justify-between items-baseline mb-1">
        <p className="text-[12px] text-[var(--fg-2)] leading-[1.6]">
          {t("hintText")}
        </p>
        <span className="text-[11px] font-semibold font-[family-name:var(--font-sans)] text-[rgba(255,180,60,0.9)] bg-[rgba(255,180,60,0.12)] border border-[rgba(255,200,100,0.22)] rounded-full py-[2px] px-2 shrink-0 ml-2">
          {fields.length}
        </span>
      </div>
      <p className="text-[12px] text-[var(--fg-3)] leading-[1.6] mb-[10px]">
        {t("hintExample")}
      </p>

      <div className="flex gap-[6px] mb-1">
        <div className={cn(colLabelClass, "w-[56px] shrink-0")}>Qty</div>
        <div className={cn(colLabelClass, "w-[68px] shrink-0")}>Unit</div>
        <div className={cn(colLabelClass, "flex-1 min-w-0")}>Ingredient</div>
        <div className="w-8 shrink-0" />
      </div>

      <div className="flex flex-col gap-0.5">
        {fields.map((field, index) => {
          const amountErr = errors.ingredients?.[index]?.amount;
          const itemErr = errors.ingredients?.[index]?.item;

          return (
            <div key={field.id} className="flex gap-[6px] items-start">
              <div className="w-[56px] shrink-0">
                <Input
                  {...register(`ingredients.${index}.amount`)}
                  type="text"
                  inputMode="decimal"
                  aria-label="qty"
                  error={!!amountErr}
                />
                <p
                  className={cn(
                    errorRowClass,
                    amountErr ? "visible" : "invisible",
                  )}
                >
                  {amountErr?.message ?? " "}
                </p>
              </div>

              <div className="w-[68px] shrink-0">
                <Input
                  {...register(`ingredients.${index}.unit`)}
                  placeholder={t("unit")}
                />
                <div className="min-h-4 mt-[3px]" />
              </div>

              <div className="flex-1 min-w-0">
                <Controller
                  control={control}
                  name={`ingredients.${index}.item`}
                  render={({ field }) => (
                    <IngredientAutocomplete
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder={t("ingredientName")}
                      error={!!itemErr}
                    />
                  )}
                />
                <p
                  className={cn(
                    errorRowClass,
                    itemErr ? "visible" : "invisible",
                  )}
                >
                  {itemErr?.message ?? " "}
                </p>
              </div>

              <button
                type="button"
                onClick={() => remove(index)}
                className={cn(
                  "w-8 h-9 rounded-[10px] shrink-0 bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.20)] flex items-center justify-center cursor-pointer transition-all duration-150 ease",
                  fields.length > 1 ? "visible" : "invisible",
                )}
              >
                <X size={13} className="text-[var(--action-destructive)]" />
              </button>
            </div>
          );
        })}
      </div>

      {errors.ingredients?.message && (
        <p className="text-[11px] text-[rgba(239,68,68,0.85)] mt-1 pl-[2px]">
          {errors.ingredients.message}
        </p>
      )}

      <button
        type="button"
        onClick={() => append({ item: "", amount: "", unit: "" })}
        className="mt-[6px] p-[10px] rounded-[14px] max-h-[37.5px] border border-dashed border-[rgba(255,200,100,0.25)] bg-[rgba(255,170,50,0.05)] text-[13px] font-medium font-[family-name:var(--font-sans)] text-[var(--fg-2)] flex items-center justify-center gap-[6px] cursor-pointer w-full transition-all duration-150 ease"
      >
        <Plus size={14} className="text-[var(--fg-2)]" />
        {t("addIngredient")}
      </button>
    </div>
  );
}
