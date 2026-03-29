"use client";

import { useTranslations } from "next-intl";
import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  useFieldArray,
} from "react-hook-form";
import { Button, Label, Textarea } from "@/components/ui";
import type { RecipeFormData } from "./schema";

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
      <Label required>{t("instructions")}</Label>

      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2 items-start">
          <span className="text-sm font-medium mt-2 min-w-[2rem]">
            {index + 1}.
          </span>
          <div className="flex-1">
            <Textarea
              {...register(`instructions.${index}.instruction`)}
              rows={2}
              placeholder={t("instructionPlaceholder")}
              error={!!errors.instructions?.[index]?.instruction}
            />
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

      {errors.instructions && (
        <p className="text-red-500 text-sm">{errors.instructions.message}</p>
      )}

      <Button
        type="button"
        variant="secondary"
        onClick={() => append({ instruction: "" })}
      >
        + {t("addStep")}
      </Button>
    </div>
  );
}
