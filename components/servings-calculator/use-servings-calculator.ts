"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/db/db";
import { createProvisionalIngredient } from "@/lib/db/ingredients";
import { addPantryItem } from "@/lib/db/pantry";
import type { PantryItem, RecipeIngredient } from "@/lib/db/schema";

export type StockStatus = "in" | "out" | "unknown";

interface UseServingsCalculatorProps {
  originalServings: number;
  canonicalIngredientIds?: string[];
  locale?: string;
}

export function useServingsCalculator({
  originalServings,
  canonicalIngredientIds,
  locale,
}: UseServingsCalculatorProps) {
  const [servings, setServings] = useState(originalServings);
  const [useCanonical, setUseCanonical] = useState(true);
  const [canonicalNames, setCanonicalNames] = useState<Map<string, string>>(
    new Map(),
  );
  const hasCanonical = (canonicalIngredientIds ?? []).length > 0;
  const ratio = servings / originalServings;

  const pantryItems = useLiveQuery(() => db.pantry.toArray(), []);

  const pantryByIngredientId = useMemo(
    () =>
      new Map<string, PantryItem>(
        (pantryItems ?? [])
          .filter(
            (item): item is PantryItem & { ingredientId: string } =>
              typeof item.ingredientId === "string",
          )
          .map((item) => [item.ingredientId, item]),
      ),
    [pantryItems],
  );

  const pantryByName = useMemo(
    () =>
      new Map<string, PantryItem>(
        (pantryItems ?? []).map((item) => [item.name.toLowerCase(), item]),
      ),
    [pantryItems],
  );

  const pantrySet = useMemo(
    () =>
      new Set<string>(
        [...pantryByIngredientId.values()]
          .filter((item) => item.on)
          .map((item) => item.ingredientId as string),
      ),
    [pantryByIngredientId],
  );

  useEffect(() => {
    const ids = (canonicalIngredientIds ?? []).filter(Boolean);
    if (!ids.length) return;

    db.ingredients.bulkGet(ids).then((entries) => {
      const map = new Map<string, string>();
      for (const entry of entries) {
        if (!entry) continue;
        const isUk = locale === "ua";
        const name = isUk ? (entry.ua ?? entry.en) : (entry.en ?? entry.ua);
        if (name) map.set(entry.id, name);
      }
      setCanonicalNames(map);
    });
  }, [canonicalIngredientIds, locale]);

  const formatAmount = (amount?: number): string | null => {
    if (!amount) return null;
    const scaled = amount * ratio;
    if (Number.isInteger(scaled)) return String(scaled);
    return scaled.toFixed(1).replace(/\.0$/, "");
  };

  const stockStatus = (index: number): StockStatus => {
    const id = canonicalIngredientIds?.[index];
    if (!id) return "unknown";
    return pantrySet.has(id) ? "in" : "out";
  };

  const displayName = (ingredient: RecipeIngredient, index: number): string => {
    if (!useCanonical) return ingredient.item;
    const canonicalId = canonicalIngredientIds?.[index];
    if (!canonicalId) return ingredient.item;
    return canonicalNames.get(canonicalId) ?? ingredient.item;
  };

  const pantryItemFor = (
    ingredient: RecipeIngredient,
    index: number,
  ): PantryItem | undefined => {
    const id = canonicalIngredientIds?.[index];
    if (id) return pantryByIngredientId.get(id);
    return pantryByName.get(ingredient.item.toLowerCase());
  };

  const addToPantry = async (
    ingredient: RecipeIngredient,
    index: number,
  ): Promise<void> => {
    const canonicalId = canonicalIngredientIds?.[index];
    const name = displayName(ingredient, index);

    let ingredientId = canonicalId;
    if (!ingredientId) {
      ingredientId = await createProvisionalIngredient(ingredient.item);
    }

    await addPantryItem({
      name,
      qty: 1,
      unit: "pcs",
      cat: "Other",
      on: true,
      ingredientId,
    });
  };

  return {
    servings,
    setServings,
    useCanonical,
    setUseCanonical,
    hasCanonical,
    formatAmount,
    stockStatus,
    displayName,
    pantryItemFor,
    addToPantry,
  };
}
