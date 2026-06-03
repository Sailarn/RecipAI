"use client";

import { ImageIcon, ScanSearch, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  useWatch,
} from "react-hook-form";
import { Input, Textarea } from "@/components/ui";
import { RECIPE_CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { FocalPointPicker } from "./focal-point-picker";
import type { CropRect } from "./image-crop-picker";
import { PhotoAdjustModal } from "./photo-adjust-modal";
import type { RecipeFormData } from "./schema";

interface BasicInfoProps {
  register: UseFormRegister<RecipeFormData>;
  errors: FieldErrors<RecipeFormData>;
  control: Control<RecipeFormData>;
  onFileSelect: (file: File | null) => void;
  focusX: number;
  focusY: number;
  onFocusChange: (x: number, y: number) => void;
  crop: CropRect | null;
  onCropChange: (crop: CropRect | null) => void;
}

const labelClass =
  "block text-[12px] font-semibold text-[var(--fg-2)] mb-[5px]";
const requiredStarClass = "text-[rgba(239,68,68,0.8)]";
const errorClass = "text-[11px] text-[rgba(239,68,68,0.85)] mt-1 pl-[2px]";

export function BasicInfo({
  register,
  errors,
  control,
  onFileSelect,
  focusX,
  focusY,
  onFocusChange,
  crop,
  onCropChange,
}: BasicInfoProps) {
  const t = useTranslations("recipeForm");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onFileSelectRef = useRef(onFileSelect);
  onFileSelectRef.current = onFileSelect;
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const currentImageUrl = useWatch({ control, name: "imageUrl" });

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const clipboardItem = Array.from(event.clipboardData?.items ?? []).find(
        (item) => item.type.startsWith("image/"),
      );
      if (!clipboardItem) return;
      const file = clipboardItem.getAsFile();
      if (!file) return;
      onFileSelectRef.current(file);
      setPreview(URL.createObjectURL(file));
    }
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    onFileSelect(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleClearFile() {
    onFileSelect(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const pickerSrc = preview ?? (currentImageUrl || null);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="title" className={labelClass}>
          {t("title")}
          <span className={requiredStarClass}> *</span>
        </label>
        <Input id="title" {...register("title")} error={!!errors.title} />
        {errors.title && <p className={errorClass}>{errors.title.message}</p>}
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          {t("description")}
        </label>
        <Textarea id="description" {...register("description")} rows={3} />
      </div>

      <div>
        <div className={labelClass}>{t("category")}</div>
        <div className="flex flex-wrap gap-[7px]">
          {RECIPE_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(isActive ? "" : cat);
                  const input = document.getElementById(
                    "category-input",
                  ) as HTMLInputElement;
                  if (input) input.value = isActive ? "" : cat;
                }}
                className={cn(
                  "py-[6px] px-[13px] rounded-full text-[12px] font-[family-name:var(--font-sans)] cursor-pointer transition-all duration-150 ease",
                  isActive
                    ? "bg-[rgba(255,180,60,0.20)] border border-[rgba(255,210,120,0.45)] text-[var(--fg-1)] font-semibold shadow-[0_0_10px_rgba(255,180,60,0.18)]"
                    : "bg-[rgba(255,170,50,0.07)] border border-[rgba(255,200,100,0.14)] text-[var(--fg-2)] font-medium",
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
        <input
          id="category-input"
          type="hidden"
          {...register("category")}
          value={selectedCategory}
        />
      </div>

      <div>
        <label htmlFor="imageUrl" className={labelClass}>
          {t("imageUrl")}
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              id="imageUrl"
              {...register("imageUrl")}
              type="url"
              error={!!errors.imageUrl}
            />
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-[42px] h-[42px] rounded-[12px] bg-[rgba(255,170,50,0.09)] border border-[rgba(255,200,100,0.18)] flex items-center justify-center cursor-pointer shrink-0"
            title="Upload from device"
          >
            <ImageIcon size={16} className="text-[var(--fg-2)]" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        {errors.imageUrl && (
          <p className={errorClass}>{errors.imageUrl.message}</p>
        )}
        <p className="text-[11px] text-[var(--fg-2)] mt-1">
          or ⌘V / Ctrl+V to paste
        </p>
        {pickerSrc && (
          <div className="relative mt-2">
            <FocalPointPicker
              imageSrc={pickerSrc}
              focusX={focusX}
              focusY={focusY}
              onChange={onFocusChange}
            />
            <p className="text-[11px] text-[var(--fg-2)] mt-1 text-center">
              Drag to set focus point
            </p>
            {preview && (
              <button
                type="button"
                onClick={handleClearFile}
                className="absolute top-2 right-2 bg-[rgba(0,0,0,0.6)] rounded-full p-1 flex items-center justify-center border-0 cursor-pointer z-[10]"
              >
                <X size={12} color="white" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAdjustModal(true)}
              className="mt-2 w-full flex items-center justify-center gap-[6px] py-2 rounded-[10px] bg-[rgba(255,170,50,0.07)] border border-[rgba(255,200,100,0.16)] text-[var(--fg-2)] text-[12px] font-medium cursor-pointer"
            >
              <ScanSearch size={13} />
              Preview in app
            </button>
          </div>
        )}
        {showAdjustModal && pickerSrc && (
          <PhotoAdjustModal
            imageSrc={pickerSrc}
            focusX={focusX}
            focusY={focusY}
            onChange={onFocusChange}
            crop={crop}
            onCropChange={onCropChange}
            onClose={() => setShowAdjustModal(false)}
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-[10px]">
        <div>
          <label htmlFor="prepTime" className={`${labelClass} text-[11px]`}>
            {t("prepTime")}
          </label>
          <Input
            id="prepTime"
            {...register("prepTime", {
              setValueAs: (value) => {
                if (value === "" || value === null || value === undefined)
                  return undefined;
                const number = Number(value);
                return Number.isNaN(number) ? undefined : number;
              },
            })}
            type="number"
            step="0.01"
            className="text-center"
          />
        </div>
        <div>
          <label htmlFor="cookTime" className={`${labelClass} text-[11px]`}>
            {t("cookTime")}
          </label>
          <Input
            id="cookTime"
            {...register("cookTime", {
              setValueAs: (value) => {
                if (value === "" || value === null || value === undefined)
                  return undefined;
                const number = Number(value);
                return Number.isNaN(number) ? undefined : number;
              },
            })}
            type="number"
            step="0.01"
            className="text-center"
          />
        </div>
        <div>
          <label htmlFor="servings" className={`${labelClass} text-[11px]`}>
            {t("servings")}
            <span className={requiredStarClass}> *</span>
          </label>
          <Input
            id="servings"
            {...register("servings")}
            type="number"
            error={!!errors.servings}
            className="text-center"
          />
          {errors.servings && (
            <p className={errorClass}>{errors.servings.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
