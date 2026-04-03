"use client";

import { ImagePlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import {
  type Control,
  Controller,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import { RECIPE_CATEGORIES } from "@/lib/categories";
import type { RecipeFormData } from "./schema";

interface BasicInfoProps {
  register: UseFormRegister<RecipeFormData>;
  errors: FieldErrors<RecipeFormData>;
  control: Control<RecipeFormData>;
  onFileSelect: (file: File | null) => void;
}

export function BasicInfo({
  register,
  errors,
  control,
  onFileSelect,
}: BasicInfoProps) {
  const t = useTranslations("recipeForm");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    onFileSelect(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleClearFile() {
    onFileSelect(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title" required>
          {t("title")}
        </Label>
        <Input id="title" {...register("title")} error={!!errors.title} />
        {errors.title && (
          <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">{t("description")}</Label>
        <Textarea id="description" {...register("description")} rows={3} />
      </div>

      <div>
        <Label htmlFor="category">{t("category")}</Label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value || ""}>
              <SelectTrigger>
                <SelectValue placeholder={t("categoryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {RECIPE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div>
        <Label htmlFor="imageUrl">{t("imageUrl")}</Label>
        <div className="flex gap-2 items-center">
          <Input
            id="imageUrl"
            {...register("imageUrl")}
            type="url"
            error={!!errors.imageUrl}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 p-2 rounded-md border border-input hover:bg-accent transition-colors"
            title="Upload from device"
          >
            <ImagePlus className="w-4 h-4" />
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
          <p className="text-red-500 text-sm mt-1">{errors.imageUrl.message}</p>
        )}
        {preview && (
          <div className="relative mt-2 w-24 h-24 rounded-md overflow-hidden border border-input">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={handleClearFile}
              className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="prepTime">{t("prepTime")}</Label>
          <Input
            id="prepTime"
            {...register("prepTime", {
              setValueAs: (v) => {
                if (v === "" || v === null || v === undefined) return undefined;
                const n = Number(v);
                return isNaN(n) ? undefined : n;
              },
            })}
            type="number"
            step="0.01"
          />
        </div>
        <div>
          <Label htmlFor="cookTime">{t("cookTime")}</Label>
          <Input
            id="cookTime"
            {...register("cookTime", {
              setValueAs: (v) => {
                if (v === "" || v === null || v === undefined) return undefined;
                const n = Number(v);
                return isNaN(n) ? undefined : n;
              },
            })}
            type="number"
            step="0.01"
          />
        </div>
        <div>
          <Label htmlFor="servings" required>
            {t("servings")}
          </Label>
          <Input
            id="servings"
            {...register("servings")}
            type="number"
            error={!!errors.servings}
          />
          {errors.servings && (
            <p className="text-red-500 text-sm mt-1">
              {errors.servings.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
