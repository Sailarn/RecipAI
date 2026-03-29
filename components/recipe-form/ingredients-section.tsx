"use client";

import { useTranslations } from "next-intl";
import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  useFieldArray,
} from "react-hook-form";
import { Button, Input, Label } from "@/components/ui";
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
    <div className="space-y-4">
      <Label required>{t("ingredients")}</Label>

      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <div className="w-20">
            <Input
              type="number"
              {...register(`ingredients.${index}.amount`)}
              placeholder={t("amount")}
              step="0.01"
              error={!!errors.ingredients?.[index]?.amount}
            />
            {errors.ingredients?.[index]?.amount && (
              <p className="text-red-500 text-sm mt-1">
                {errors.ingredients[index]?.amount?.message}
              </p>
            )}
          </div>
          <div className="w-24">
            <Input
              {...register(`ingredients.${index}.unit`)}
              placeholder={t("unit")}
            />
          </div>
          <div className="flex-1">
            <Input
              {...register(`ingredients.${index}.item`)}
              placeholder={t("ingredientName")}
              error={!!errors.ingredients?.[index]?.item}
            />
            {errors.ingredients?.[index]?.item && (
              <p className="text-red-500 text-sm mt-1">
                {errors.ingredients[index]?.item?.message}
              </p>
            )}
          </div>
          {fields.length > 1 && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => remove(index)}
            >
              {t("remove")}
            </Button>
          )}
        </div>
      ))}

      {errors.ingredients && (
        <p className="text-red-500 text-sm">{errors.ingredients.message}</p>
      )}

      <Button
        type="button"
        variant="secondary"
        onClick={() => append({ item: "", amount: "1", unit: "" })}
      >
        + {t("addIngredient")}
      </Button>
    </div>
  );
}
