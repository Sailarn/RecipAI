"use client";

import { useTranslations } from "next-intl";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import type { RecipeFormData } from "./index";

interface InstructionsSectionProps {
  register: UseFormRegister<RecipeFormData>;
  control: Control<RecipeFormData>;
  errors: FieldErrors<RecipeFormData>;
}

export function InstructionsSection({
  register,
  control,
  errors,
}: InstructionsSectionProps) {
  const t = useTranslations("recipeForm");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "instructions",
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{t("instructions")} *</h2>

      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2 items-start">
          <span className="text-sm font-medium mt-2">{index + 1}.</span>
          <textarea
            {...register(`instructions.${index}.instruction`)}
            rows={2}
            placeholder={`${t("instructionStep")} *`}
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
        onClick={() => append({ instruction: "" })}
        className="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {t("addStep")}
      </button>

      {errors.instructions?.message && (
        <p className="text-red-500 text-sm">{errors.instructions.message}</p>
      )}
    </div>
  );
}
