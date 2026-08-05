"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImageIcon, ImagePlus, Pencil, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { Input, Textarea } from "@/components/ui";
import type { RecipeFormData } from "../schema";

export interface StepCardProps {
  stepId: string;
  index: number;
  totalSteps: number;
  imageUrl?: string;
  error: boolean;
  register: UseFormRegister<RecipeFormData>;
  setValue: UseFormSetValue<RecipeFormData>;
  onRemove: () => void;
  onStepFileSelect: (stepId: string, file: File | null) => void;
  compact?: boolean;
  isDetailsExpanded?: boolean;
  onToggleDetails?: () => void;
}

function clipboardImage(items: DataTransferItemList): File | null {
  return (
    Array.from(items)
      .find((item) => item.type.startsWith("image/"))
      ?.getAsFile() ?? null
  );
}

export function StepCard({
  stepId,
  index,
  totalSteps,
  imageUrl,
  error,
  register,
  setValue,
  onRemove,
  onStepFileSelect,
  compact = false,
  isDetailsExpanded = false,
  onToggleDetails,
}: StepCardProps) {
  const t = useTranslations("recipeForm");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stepId });
  const [imagesExpanded, setImagesExpanded] = useState(Boolean(imageUrl));
  const [existingImageUrl, setExistingImageUrl] = useState(imageUrl);
  const [preview, setPreview] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const style = { transform: CSS.Transform.toString(transform), transition };
  const displayedImage = preview ?? existingImageUrl;

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function selectFile(file: File | null) {
    if (!file) return;
    onStepFileSelect(stepId, file);
    setPreview(URL.createObjectURL(file));
  }

  function clearImage() {
    onStepFileSelect(stepId, null);
    setValue(`instructions.${index}.imageUrl`, "", { shouldDirty: true });
    setPreview(undefined);
    setExistingImageUrl(undefined);
    setImagesExpanded(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`step-card-${index}`}
      className={`rounded-[16px] border border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] p-[12px_14px] ${isDragging ? "rotate-[-1.2deg] scale-[1.02] shadow-xl" : ""}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          aria-label={t("dragStep")}
          className="cursor-grab touch-none text-[var(--fg-3)]"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-[8px] bg-[linear-gradient(135deg,var(--action-primary),var(--ai-accent))] text-[11px] font-bold text-white">
          {index + 1}
        </div>
        <span className="flex-1 text-[12px] font-semibold text-[var(--fg-2)]">
          Step {index + 1}
        </span>
        {totalSteps > 1 && (
          <button
            type="button"
            aria-label={t("removeStep")}
            onClick={onRemove}
            className="p-1 text-[var(--action-destructive)]"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {compact && !isDetailsExpanded ? (
        <button
          type="button"
          onClick={onToggleDetails}
          className="flex items-center gap-1 text-[12px] text-[var(--fg-3)]"
        >
          <Pencil size={12} />
          {t("editStep")}
        </button>
      ) : (
        <>
          <Textarea
            {...register(`instructions.${index}.instruction`)}
            rows={3}
            placeholder={t("instructionPlaceholder")}
            error={error}
            className="mb-2"
          />
          {imagesExpanded && (
            <div className="mb-2 flex gap-2">
              <Input
                {...register(`instructions.${index}.imageUrl`)}
                placeholder={t("stepImagePlaceholder")}
                type="url"
                onPaste={(event) =>
                  selectFile(clipboardImage(event.clipboardData.items))
                }
              />
              <button
                type="button"
                aria-label={t("uploadStepImage")}
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-[var(--fg-2)]"
              >
                <ImagePlus size={14} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) =>
                  selectFile(event.target.files?.[0] ?? null)
                }
              />
              {displayedImage && (
                // biome-ignore lint/performance/noImgElement: local previews use blob URLs
                <img
                  src={displayedImage}
                  alt={`Step ${index + 1}`}
                  className="h-8 w-12 rounded object-cover"
                />
              )}
            </div>
          )}
          <button
            type="button"
            aria-label={displayedImage ? t("removeImage") : t("addImage")}
            onClick={() => {
              if (displayedImage) clearImage();
              else setImagesExpanded((expanded) => !expanded);
            }}
            className="flex items-center gap-1 text-[12px] text-[var(--fg-3)]"
          >
            <ImageIcon size={12} />
            {displayedImage ? t("removeImage") : t("addImage")}
          </button>
          {compact && (
            <button
              type="button"
              onClick={onToggleDetails}
              className="mt-2 text-[12px] text-[var(--fg-3)]"
            >
              {t("collapseStep")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
