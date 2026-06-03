"use client";

import { ImageIcon, ImagePlus, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  useFieldArray,
} from "react-hook-form";
import { Input, Textarea } from "@/components/ui";
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
      fields.forEach((field, index) => {
        // biome-ignore lint/suspicious/noExplicitAny: useFieldArray field type doesn't expose imageUrl
        if ((field as any).imageUrl) initial[index] = true;
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
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;
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
    <div>
      <p className="text-[12px] text-[var(--fg-2)] leading-[1.6] mb-4">
        {t("stepHintText")}
      </p>

      <div className="flex flex-col gap-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-[16px] p-[12px_14px] bg-[var(--glass-card-bg)] [backdrop-filter:var(--glass-card-blur)] [-webkit-backdrop-filter:var(--glass-card-blur)] border border-[var(--glass-card-border)] shadow-[var(--glass-card-shadow)]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-[22px] h-[22px] rounded-[8px] bg-[linear-gradient(135deg,var(--action-primary),var(--ai-accent))] text-white text-[11px] font-bold font-[family-name:var(--font-sans)] flex items-center justify-center">
                  {index + 1}
                </div>
                <span className="text-[12px] font-semibold text-[var(--fg-2)]">
                  Step {index + 1}
                </span>
              </div>

              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="w-7 h-7 rounded-[8px] bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.20)] flex items-center justify-center cursor-pointer shrink-0"
                >
                  <X size={12} className="text-[var(--action-destructive)]" />
                </button>
              )}
            </div>

            <Textarea
              {...register(`instructions.${index}.instruction`)}
              rows={3}
              placeholder={t("instructionPlaceholder")}
              error={!!errors.instructions?.[index]?.instruction}
              className="mb-2"
            />

            {expandedImages[index] && (
              <div className="mb-2">
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Input
                      {...register(`instructions.${index}.imageUrl`)}
                      placeholder="Image URL or paste"
                      type="url"
                      onPaste={(event) => {
                        const clipboardItem = Array.from(
                          event.clipboardData?.items ?? [],
                        ).find((item) => item.type.startsWith("image/"));
                        if (!clipboardItem) return;
                        event.preventDefault();
                        const file = clipboardItem.getAsFile();
                        if (!file) return;
                        onStepFileSelect(index, file);
                        setStepPreviews((prev) => ({
                          ...prev,
                          [index]: URL.createObjectURL(file),
                        }));
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[index]?.click()}
                    className="w-8 h-8 rounded-[8px] bg-[rgba(255,170,50,0.09)] border border-[rgba(255,200,100,0.18)] flex items-center justify-center cursor-pointer shrink-0"
                    title="Upload from device"
                  >
                    <ImagePlus size={14} className="text-[var(--fg-2)]" />
                  </button>
                  <input
                    ref={(el) => {
                      fileInputRefs.current[index] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleStepFileChange(index, event)}
                  />
                </div>
                {stepPreviews[index] && (
                  <div className="relative mt-2 h-20 w-32 rounded-[8px] overflow-hidden border border-[rgba(255,200,100,0.18)]">
                    {/* biome-ignore lint/performance/noImgElement: preview uses blob URL */}
                    <img
                      src={stepPreviews[index]}
                      alt={`Step ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleClearStepFile(index)}
                      className="absolute top-1 right-1 bg-[rgba(0,0,0,0.6)] rounded-full p-0.5 flex items-center justify-center border-0 cursor-pointer"
                    >
                      <X size={10} color="white" />
                    </button>
                  </div>
                )}
                {!stepPreviews[index] &&
                  (field as { imageUrl?: string }).imageUrl && (
                    <div className="relative mt-2 h-20 w-32 rounded-[8px] overflow-hidden">
                      {/* biome-ignore lint/performance/noImgElement: existing image URL */}
                      <img
                        src={(field as { imageUrl?: string }).imageUrl}
                        alt={`Step ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
              </div>
            )}

            <button
              type="button"
              onClick={() => toggleImage(index)}
              className="bg-transparent border-0 cursor-pointer flex items-center gap-[5px] text-[12px] text-[var(--fg-3)] p-0 font-[family-name:var(--font-sans)]"
            >
              <ImageIcon size={12} />
              {expandedImages[index] ? t("removeImage") : t("addImage")}
            </button>
          </div>
        ))}
      </div>

      {errors.instructions && (
        <p className="text-[11px] text-[rgba(239,68,68,0.85)] mt-1 pl-[2px]">
          {errors.instructions.message}
        </p>
      )}

      <button
        type="button"
        onClick={() => append({ instruction: "", imageUrl: "" })}
        className="mt-3 p-[10px] rounded-[14px] max-h-[37.5px] border border-dashed border-[rgba(255,200,100,0.25)] bg-[rgba(255,170,50,0.05)] text-[13px] font-medium font-[family-name:var(--font-sans)] text-[var(--fg-2)] flex items-center justify-center gap-[6px] cursor-pointer w-full transition-all duration-150 ease"
      >
        <Plus size={14} className="text-[var(--fg-2)]" />
        {t("addStep")}
      </button>
    </div>
  );
}
