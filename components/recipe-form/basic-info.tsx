"use client";

import { useTranslations } from "next-intl";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
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
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          {t("title")} *
        </label>
        <input
          id="title"
          {...register("title")}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
        />
        {errors.title && (
          <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          {t("description")}
        </label>
        <textarea
          id="description"
          {...register("description")}
          rows={3}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium mb-1">
          {t("imageUrl")}
        </label>
        <input
          id="imageUrl"
          {...register("imageUrl")}
          type="url"
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
        />
        {errors.imageUrl && (
          <p className="text-red-500 text-sm mt-1">{errors.imageUrl.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="prepTime" className="block text-sm font-medium mb-1">
            {t("prepTime")}
          </label>
          <input
            id="prepTime"
            {...register("prepTime", { valueAsNumber: true })}
            type="number"
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="cookTime" className="block text-sm font-medium mb-1">
            {t("cookTime")}
          </label>
          <input
            id="cookTime"
            {...register("cookTime", { valueAsNumber: true })}
            type="number"
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="servings" className="block text-sm font-medium mb-1">
            {t("servings")} *
          </label>
          <input
            id="servings"
            {...register("servings", { valueAsNumber: true })}
            type="number"
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
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
