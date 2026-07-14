"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Check, Pencil, Plus, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  type Control,
  Controller,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import { IngredientPicker } from "@/components/ingredient-picker";
import { getIngredientDisplayName } from "@/components/ingredient-picker/display-name";
import { Input } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import { db } from "@/lib/db/db";
import {
  modifierLabel,
  type PreparationModifier,
} from "@/lib/parse-recipe/modifiers";
import { cn, generateId } from "@/lib/utils";
import { AdditivePicker } from "./ingredients-section/additive-picker";
import {
  buildVocabIdIndex,
  buildVocabNameIndex,
  localizeIngredientItem,
} from "./localize-item";
import type { RecipeFormData } from "./schema";

interface IngredientsSectionProps {
  register: UseFormRegister<RecipeFormData>;
  control: Control<RecipeFormData>;
  errors: FieldErrors<RecipeFormData>;
  setValue: UseFormSetValue<RecipeFormData>;
  locale: Locale;
  // Resolved canonical id per ingredient (index-aligned with the recipe's
  // ingredients on load), so descriptive phrases localize to their canonical
  // name like the servings calculator does.
  canonicalIngredientIds?: string[];
}

const colLabelClass =
  "text-[10px] font-semibold font-[family-name:var(--font-sans)] text-[var(--fg-3)] uppercase tracking-[0.06em] pl-[3px]";
const errorRowClass =
  "text-[10px] text-[rgba(239,68,68,0.85)] mt-[3px] pl-[2px] min-h-4 leading-[1.3]";

export function IngredientsSection({
  register,
  control,
  errors,
  setValue,
  locale,
  canonicalIngredientIds,
}: IngredientsSectionProps) {
  const t = useTranslations("recipeForm");
  const { fields, append, remove } = useFieldArray({
    control,
    name: "ingredients",
  });
  const [pickerRow, setPickerRow] = useState<number | null>(null);
  const [additivePickerRow, setAdditivePickerRow] = useState<string | null>(
    null,
  );

  const vocab = useLiveQuery(() => db.ingredients.toArray(), []);
  const vocabIndex = useMemo(() => buildVocabNameIndex(vocab ?? []), [vocab]);
  const vocabById = useMemo(() => buildVocabIdIndex(vocab ?? []), [vocab]);

  // Vocab ids already used by a row in this recipe — the picker marks these as
  // chosen (still pickable) so you can see what's already in the recipe.
  const watchedIngredients = useWatch({ control, name: "ingredients" });
  const chosenIngredientIds = useMemo(() => {
    const ids = new Set<string>();
    for (const ingredient of watchedIngredients ?? []) {
      const entry = vocabIndex.get(
        (ingredient.item ?? "").trim().toLowerCase(),
      );
      if (entry) ids.add(entry.id);
    }
    return ids;
  }, [watchedIngredients, vocabIndex]);

  function handlePick(displayName: string) {
    if (pickerRow === null) return;
    setValue(`ingredients.${pickerRow}.item`, displayName, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setPickerRow(null);
  }

  function toggleModifier(index: number, modifier: PreparationModifier) {
    const modifiers = watchedIngredients?.[index]?.modifiers ?? [];
    const nextModifiers = modifiers.includes(modifier)
      ? modifiers.filter((item) => item !== modifier)
      : [...modifiers, modifier];
    setValue(`ingredients.${index}.modifiers`, nextModifiers, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <p className="text-[12px] text-[var(--fg-2)] leading-[1.6]">
          {t("hintText")}
        </p>
        <span className="text-[11px] font-semibold font-[family-name:var(--font-sans)] text-[rgba(255,180,60,0.9)] bg-[rgba(255,180,60,0.12)] border border-[rgba(255,200,100,0.22)] rounded-full py-[2px] px-2 shrink-0 ml-2">
          {fields.length}
        </span>
      </div>
      <p className="text-[12px] text-[var(--fg-3)] leading-[1.6] mb-[10px]">
        {t("hintExample")}
      </p>

      <div className="flex gap-[6px] mb-1">
        <div className={cn(colLabelClass, "w-[56px] shrink-0")}>Qty</div>
        <div className={cn(colLabelClass, "w-[68px] shrink-0")}>Unit</div>
        <div className={cn(colLabelClass, "flex-1 min-w-0")}>Ingredient</div>
        <div className="w-8 shrink-0" />
      </div>

      <div className="flex flex-col gap-0.5">
        {fields.map((field, index) => {
          const amountErr = errors.ingredients?.[index]?.amount;
          const itemErr = errors.ingredients?.[index]?.item;
          const additivePickerId = `ingredient-state-picker-${field.id}`;
          const isAdditivePickerOpen = additivePickerRow === field.id;
          const modifiers = watchedIngredients?.[index]?.modifiers ?? [];

          return (
            <div key={field.id}>
              <div className="flex gap-[6px] items-start">
                <div className="w-[56px] shrink-0">
                  <Input
                    {...register(`ingredients.${index}.amount`)}
                    type="text"
                    inputMode="decimal"
                    aria-label="qty"
                    error={!!amountErr}
                  />
                  <p
                    className={cn(
                      errorRowClass,
                      amountErr ? "visible" : "invisible",
                    )}
                  >
                    {amountErr?.message ?? " "}
                  </p>
                </div>

                <div className="w-[68px] shrink-0">
                  <Input
                    {...register(`ingredients.${index}.unit`)}
                    placeholder={t("unit")}
                  />
                  <div className="min-h-4 mt-[3px]" />
                </div>

                <div className="flex-1 min-w-0">
                  <Controller
                    control={control}
                    name={`ingredients.${index}.item`}
                    render={({ field: itemField }) => (
                      <button
                        type="button"
                        aria-label={t("ingredientName")}
                        data-testid={`ingredient-trigger-${index}`}
                        onClick={() => setPickerRow(index)}
                        className={cn(
                          "w-full rounded-[14px] px-3 py-2 border text-left text-base font-[family-name:var(--font-sans)] truncate transition-colors bg-[rgba(255,170,50,0.07)] backdrop-blur-[12px]",
                          itemErr
                            ? "border-red-500"
                            : "border-[rgba(255,200,100,0.15)]",
                          itemField.value
                            ? "text-[var(--fg-1)]"
                            : "text-[var(--fg-3)]",
                        )}
                      >
                        {itemField.value
                          ? localizeIngredientItem(
                              itemField.value,
                              vocabIndex,
                              locale,
                              vocabById.get(
                                canonicalIngredientIds?.[index] ?? "",
                              ),
                            )
                          : t("ingredientName")}
                      </button>
                    )}
                  />
                  <p
                    className={cn(
                      errorRowClass,
                      itemErr ? "visible" : "invisible",
                    )}
                  >
                    {itemErr?.message ?? " "}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => remove(index)}
                  className={cn(
                    "w-8 h-9 rounded-[10px] shrink-0 bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.20)] flex items-center justify-center cursor-pointer transition-all duration-150 ease",
                    fields.length > 1 ? "visible" : "invisible",
                  )}
                >
                  <X size={13} className="text-[var(--action-destructive)]" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pl-[2px]">
                {modifiers.length ? (
                  <>
                    <button
                      type="button"
                      data-testid={`additive-applied-${index}`}
                      aria-label={t("editIngredientStates")}
                      aria-controls={additivePickerId}
                      aria-expanded={isAdditivePickerOpen}
                      onClick={() => setAdditivePickerRow(field.id)}
                      className="flex flex-wrap gap-2 text-left"
                    >
                      {modifiers.map((modifier) => (
                        <span
                          key={modifier}
                          className="flex items-center gap-1 rounded-full border border-[rgba(74,222,128,0.5)] bg-[rgba(74,222,128,0.16)] px-3 py-[5px] text-[12.5px] font-semibold text-[rgba(74,222,128,0.98)]"
                        >
                          <Check size={12} />
                          {modifierLabel(modifier, locale)}
                        </span>
                      ))}
                    </button>
                    <button
                      type="button"
                      aria-label={t("editIngredientStates")}
                      aria-controls={additivePickerId}
                      aria-expanded={isAdditivePickerOpen}
                      onClick={() => setAdditivePickerRow(field.id)}
                      className="flex size-[30px] items-center justify-center rounded-[8px] border border-[rgba(255,200,100,0.22)] text-[var(--fg-2)]"
                    >
                      <Pencil size={13} />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    data-testid={`additive-empty-${index}`}
                    aria-controls={additivePickerId}
                    aria-expanded={isAdditivePickerOpen}
                    onClick={() => setAdditivePickerRow(field.id)}
                    className="flex items-center gap-1 rounded-full border border-dashed border-[rgba(251,146,60,0.38)] bg-[rgba(251,146,60,0.05)] px-3 py-[5px] text-[12.5px] font-semibold text-[rgba(251,146,60,0.95)]"
                  >
                    <Plus size={12} />
                    {t("addState")}
                  </button>
                )}
              </div>

              {additivePickerRow === field.id && (
                <AdditivePicker
                  id={additivePickerId}
                  modifiers={modifiers}
                  locale={locale}
                  title={t("ingredientStatePickerTitle")}
                  closeLabel={t("closeIngredientStatePicker")}
                  onClose={() => setAdditivePickerRow(null)}
                  onToggle={(modifier) => toggleModifier(index, modifier)}
                />
              )}
            </div>
          );
        })}
      </div>

      {errors.ingredients?.message && (
        <p className="text-[11px] text-[rgba(239,68,68,0.85)] mt-1 pl-[2px]">
          {errors.ingredients.message}
        </p>
      )}

      <button
        type="button"
        onClick={() =>
          append({
            rowId: generateId(),
            item: "",
            amount: "",
            unit: "",
            modifiers: [],
            sectionId: null,
          })
        }
        className="mt-[6px] p-[10px] rounded-[14px] max-h-[37.5px] border border-dashed border-[rgba(255,200,100,0.25)] bg-[rgba(255,170,50,0.05)] text-[13px] font-medium font-[family-name:var(--font-sans)] text-[var(--fg-2)] flex items-center justify-center gap-[6px] cursor-pointer w-full transition-all duration-150 ease"
      >
        <Plus size={14} className="text-[var(--fg-2)]" />
        {t("addIngredient")}
      </button>

      <AnimatePresence>
        {pickerRow !== null && (
          <IngredientPicker
            key="recipe-ingredient-picker"
            title={t("ingredientName")}
            onClose={() => setPickerRow(null)}
            markedIngredientIds={chosenIngredientIds}
            onPick={(ingredient) =>
              handlePick(getIngredientDisplayName(ingredient, locale))
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
