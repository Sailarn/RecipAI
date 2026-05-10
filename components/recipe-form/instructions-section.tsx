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
      fields.forEach((field, idx) => {
        // biome-ignore lint/suspicious/noExplicitAny: useFieldArray field type doesn't expose imageUrl
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
    <div>
      {/* Hint text */}
      <p
        style={{
          fontSize: 12,
          color: "var(--fg-2)",
          lineHeight: 1.6,
          marginBottom: 16,
        }}
      >
        {t("stepHintText")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {fields.map((field, index) => (
          <div
            key={field.id}
            style={{
              borderRadius: 16,
              padding: "12px 14px",
              background: "var(--glass-card-bg)",
              backdropFilter: "var(--glass-card-blur)",
              WebkitBackdropFilter: "var(--glass-card-blur)",
              border: "1px solid var(--glass-card-border)",
              boxShadow: "var(--glass-card-shadow)",
            }}
          >
            {/* Step header row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Gradient number badge */}
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 8,
                    background:
                      "linear-gradient(135deg, var(--action-primary), var(--ai-accent))",
                    color: "#fff",
                    font: "11px / 700 var(--font-sans)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {index + 1}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--fg-2)",
                  }}
                >
                  Step {index + 1}
                </span>
              </div>

              {/* Remove button */}
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "rgba(239,68,68,0.10)",
                    border: "1px solid rgba(239,68,68,0.20)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <X size={12} style={{ color: "var(--action-destructive)" }} />
                </button>
              )}
            </div>

            {/* Textarea */}
            <Textarea
              {...register(`instructions.${index}.instruction`)}
              rows={3}
              placeholder={t("instructionPlaceholder")}
              error={!!errors.instructions?.[index]?.instruction}
              style={{ marginBottom: 8 }}
            />

            {/* Image section */}
            {expandedImages[index] && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      {...register(`instructions.${index}.imageUrl`)}
                      placeholder="Image URL"
                      type="url"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[index]?.click()}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "rgba(255,170,50,0.09)",
                      border: "1px solid rgba(255,200,100,0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                    title="Upload from device"
                  >
                    <ImagePlus size={14} style={{ color: "var(--fg-2)" }} />
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
                  <div
                    style={{
                      position: "relative",
                      marginTop: 8,
                      height: 80,
                      width: 128,
                      borderRadius: 8,
                      overflow: "hidden",
                      border: "1px solid rgba(255,200,100,0.18)",
                    }}
                  >
                    {/* biome-ignore lint/performance/noImgElement: preview uses blob URL */}
                    <img
                      src={stepPreviews[index]}
                      alt={`Step ${index + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleClearStepFile(index)}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        background: "rgba(0,0,0,0.6)",
                        borderRadius: "50%",
                        padding: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <X size={10} color="white" />
                    </button>
                  </div>
                )}
                {!stepPreviews[index] &&
                  (field as { imageUrl?: string }).imageUrl && (
                    <div
                      style={{
                        position: "relative",
                        marginTop: 8,
                        height: 80,
                        width: 128,
                        borderRadius: 8,
                        overflow: "hidden",
                      }}
                    >
                      {/* biome-ignore lint/performance/noImgElement: existing image URL */}
                      <img
                        src={(field as { imageUrl?: string }).imageUrl}
                        alt={`Step ${index + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                  )}
              </div>
            )}

            {/* Add image ghost link */}
            <button
              type="button"
              onClick={() => toggleImage(index)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                color: "var(--fg-3)",
                padding: 0,
                fontFamily: "var(--font-sans)",
              }}
            >
              <ImageIcon size={12} />
              {expandedImages[index] ? t("removeImage") : t("addImage")}
            </button>
          </div>
        ))}
      </div>

      {errors.instructions && (
        <p
          style={{
            fontSize: 11,
            color: "rgba(239,68,68,0.85)",
            marginTop: 4,
            paddingLeft: 2,
          }}
        >
          {errors.instructions.message}
        </p>
      )}

      {/* Add step dashed button */}
      <button
        type="button"
        onClick={() => append({ instruction: "", imageUrl: "" })}
        style={{
          marginTop: 12,
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
        {t("addStep")}
      </button>
    </div>
  );
}
