"use client";

import { ImageIcon, ImagePlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
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
  onStepFileSelect: (index: number, file: File | null) => void;
}

export function InstructionsSection({
  register,
  control,
  errors,
  onStepFileSelect,
}: InstructionsSectionProps) {
  const t = useTranslations("recipeForm");
  const { fields, append, remove } = useFieldArray({
    control,
    name: "instructions",
  });
  const [expandedImages, setExpandedImages] = useState<Record<number, boolean>>(
    () => {
      const initial: Record<number, boolean> = {};
      fields.forEach((field, idx) => {
        if ((field as any).imageUrl) initial[idx] = true;
      });
      return initial;
    },
  );
  const [stepPreviews, setStepPreviews] = useState<Record<number, string>>({});
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const toggleImage = (index: number) => {
    setExpandedImages((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  function handleStepFileChange(
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    onStepFileSelect(index, file);
    setStepPreviews((prev) => ({
      ...prev,
      [index]: URL.createObjectURL(file),
    }));
  }

  function handleClearStepFile(index: number) {
    onStepFileSelect(index, null);
    setStepPreviews((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    const input = fileInputRefs.current[index];
    if (input) input.value = "";
  }

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
                <div className="flex gap-2 items-center">
                  <Input
                    {...register(`instructions.${index}.imageUrl`)}
                    placeholder="Image URL"
                    type="url"
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[index]?.click()}
                    className="shrink-0 p-2 rounded-md border border-input hover:bg-accent transition-colors"
                    title="Upload from device"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </button>
                  <input
                    ref={(el) => {
                      fileInputRefs.current[index] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleStepFileChange(index, e)}
                  />
                </div>
                {stepPreviews[index] && (
                  <div className="relative h-20 w-32 rounded overflow-hidden border border-input">
                    <img
                      src={stepPreviews[index]}
                      alt={`Step ${index + 1}`}
                      className="object-cover w-full h-full"
                    />
                    <button
                      type="button"
                      onClick={() => handleClearStepFile(index)}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}
                {!stepPreviews[index] && (field as any).imageUrl && (
                  <div className="relative h-20 w-32 rounded overflow-hidden">
                    <img
                      src={(field as any).imageUrl}
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
