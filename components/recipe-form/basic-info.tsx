"use client";

import { useTranslations } from "next-intl";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input, Label, Textarea } from "@/components/ui";
import type { RecipeFormData } from "./index";

interface BasicInfoProps {
  register: UseFormRegister<RecipeFormData>;
  errors: FieldErrors<RecipeFormData>;
}

export function BasicInfo({ register, errors }: BasicInfoProps) {
  const t = useTranslations("recipeForm");

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
        <Label htmlFor="imageUrl">{t("imageUrl")}</Label>
        <Input
          id="imageUrl"
          {...register("imageUrl")}
          type="url"
          error={!!errors.imageUrl}
        />
        {errors.imageUrl && (
          <p className="text-red-500 text-sm mt-1">{errors.imageUrl.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="prepTime">{t("prepTime")}</Label>
          <Input
            id="prepTime"
            {...register("prepTime", { valueAsNumber: true })}
            type="number"
          />
        </div>
        <div>
          <Label htmlFor="cookTime">{t("cookTime")}</Label>
          <Input
            id="cookTime"
            {...register("cookTime", { valueAsNumber: true })}
            type="number"
          />
        </div>
        <div>
          <Label htmlFor="servings" required>
            {t("servings")}
          </Label>
          <Input
            id="servings"
            {...register("servings", { valueAsNumber: true })}
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
