"use client";

import { useTranslations } from "next-intl";

interface DeleteModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteModal({ isOpen, onConfirm, onCancel }: DeleteModalProps) {
  const t = useTranslations("common");
  const tRecipes = useTranslations("recipes");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-semibold mb-4">{t("confirm")}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {tRecipes("deleteConfirm")}
        </p>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition-colors"
          >
            {t("delete")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
