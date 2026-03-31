"use client";

import { useTranslations } from "next-intl";
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
}

export function BasicInfo({ register, errors, control }: BasicInfoProps) {
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
            {...register("prepTime", {
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
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
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
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
