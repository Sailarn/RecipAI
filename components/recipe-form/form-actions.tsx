"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface FormActionsProps {
  isSubmitting: boolean;
  isEdit?: boolean;
}

export function FormActions({ isSubmitting, isEdit }: FormActionsProps) {
  const router = useRouter();
  const t = useTranslations("common");
  const tRecipes = useTranslations("recipes");

  return (
    <div className="flex gap-4">
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isSubmitting
          ? t("saving")
          : isEdit
            ? tRecipes("updateRecipe")
            : tRecipes("createRecipe")}
      </button>
      <button
        type="button"
        onClick={() => router.back()}
        className="rounded-md border border-gray-300 dark:border-gray-700 px-6 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {t("cancel")}
      </button>
    </div>
  );
}
