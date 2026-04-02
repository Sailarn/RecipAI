"use client";

import { ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  useFieldArray,
} from "react-hook-form";
import { Button, Input, Label, Textarea } from "@/components/ui";
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
  const [expandedImages, setExpandedImages] = useState<Record<number, boolean>>(
    () => {
      // pre-expand any steps that already have images
      const initial: Record<number, boolean> = {};
      fields.forEach((field, idx) => {
        if ((field as any).imageUrl) initial[idx] = true;
      });
      return initial;
    },
  );

  const toggleImage = (index: number) => {
    setExpandedImages((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="space-y-4">
      <Label required>{t("instructions")}</Label>

      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2 items-start">
          <span className="text-sm font-medium mt-2 min-w-[2rem]">
            {index + 1}.
          </span>
          <div className="flex-1 space-y-2">
            <Textarea
              {...register(`instructions.${index}.instruction`)}
              rows={2}
              placeholder={t("instructionPlaceholder")}
              error={!!errors.instructions?.[index]?.instruction}
            />
            {expandedImages[index] && (
              <div className="space-y-1">
                <Input
                  {...register(`instructions.${index}.imageUrl`)}
                  placeholder="Image URL"
                  type="url"
                />
                {/* preview */}
                {(fields[index] as any).imageUrl && (
                  <div className="relative h-20 w-32 rounded overflow-hidden">
                    <img
                      src={(fields[index] as any).imageUrl}
                      alt={`Step ${index + 1}`}
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => toggleImage(index)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ImageIcon className="w-3 h-3" />
              {expandedImages[index] ? "Remove image" : "Add image"}
            </button>
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
        onClick={() => append({ instruction: "", imageUrl: "" })}
      >
        + {t("addStep")}
      </Button>
    </div>
  );
}
