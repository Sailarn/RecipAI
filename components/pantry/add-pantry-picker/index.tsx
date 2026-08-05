"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { IngredientPicker } from "@/components/ingredient-picker";
import { getIngredientDisplayName } from "@/components/ingredient-picker/display-name";
import type { Locale } from "@/i18n/config";
import { db } from "@/lib/db/db";
import { addPantryItem } from "@/lib/db/pantry";
import type { VocabularyIngredient } from "@/lib/db/schema";
import { trackEvent } from "@/lib/telemetry";

function commitLabel(count: number): string {
  if (count === 0) return "Add items to Pantry";
  return `Add ${count} item${count === 1 ? "" : "s"} to Pantry`;
}

export function AddPantryPicker({ onClose }: { onClose: () => void }) {
  const t = useTranslations("pantry");
  const { locale = "en" } = useParams<{ locale: Locale }>();

  const pantryItems = useLiveQuery(() => db.pantry.toArray(), []);
  const addedIngredientIds = useMemo<Set<string>>(
    () =>
      new Set(
        (pantryItems ?? [])
          .map((item) => item.ingredientId)
          .filter((ingredientId): ingredientId is string =>
            Boolean(ingredientId),
          ),
      ),
    [pantryItems],
  );

  async function handleCommit(ingredients: VocabularyIngredient[]) {
    for (const ingredient of ingredients) {
      await addPantryItem({
        name: getIngredientDisplayName(ingredient, locale),
        ingredientId: ingredient.id,
        on: true,
      });
      trackEvent("pantry_item_added", undefined);
    }
    onClose();
  }

  return (
    <IngredientPicker
      testId="add-pantry-picker"
      title={t("addTitle")}
      onClose={onClose}
      disabledIngredientIds={addedIngredientIds}
      commit={{ label: commitLabel, onCommit: handleCommit }}
    />
  );
}
