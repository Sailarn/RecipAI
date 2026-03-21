"use client";

import { useTranslations } from "next-intl";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import type { RecipeFormData } from "./index";

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
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{t("ingredients")} *</h2>

      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2 items-start">
          <input
            {...register(`ingredients.${index}.amount`, {
              valueAsNumber: true,
            })}
            type="number"
            step="0.01"
            placeholder={t("amount")}
            className="w-24 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
          />
          <input
            {...register(`ingredients.${index}.unit`)}
            placeholder={t("unit")}
            className="w-24 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
          />
          <input
            {...register(`ingredients.${index}.item`)}
            placeholder={`${t("ingredientName")} *`}
            className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
          />
          {fields.length > 1 && (
            <button
              type="button"
              onClick={() => remove(index)}
              className="px-3 py-2 text-red-600 hover:text-red-700"
            >
              {t("remove")}
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => append({ item: "", amount: undefined, unit: "" })}
        className="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {t("addIngredient")}
      </button>

      {errors.ingredients?.message && (
        <p className="text-red-500 text-sm">{errors.ingredients.message}</p>
      )}
    </div>
  );
}
