"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { IngredientAutocomplete } from "@/components/ingredient-autocomplete";
import { resolveOrCreateIngredient } from "@/lib/db/ingredients";
import { addPantryItem } from "@/lib/db/pantry";
import type { VocabularyIngredient } from "@/lib/db/schema";
import { trackEvent } from "@/lib/telemetry";
import {
  CAT_OPTIONS,
  type CatOption,
  mapVocabCategory,
  UNIT_OPTIONS,
  type UnitOption,
} from "./constants";

// text-base (16px) keeps iOS Safari from auto-zooming inputs on focus
const FIELD_CLASS =
  "py-2.5 px-3 bg-[rgba(255,200,100,0.06)] border border-[rgba(255,200,100,0.2)] rounded-xl text-[var(--fg-1)] font-sans text-base";

export function AddItemSheet({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [ingredientId, setIngredientId] = useState<string | undefined>(
    undefined,
  );
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState<UnitOption>("pcs");
  const [cat, setCat] = useState<CatOption>("Other");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleNameChange(value: string) {
    setName(value);
    setIngredientId(undefined);
  }

  function handleSelect(entry: VocabularyIngredient) {
    setIngredientId(entry.id);
    const mapped = mapVocabCategory(entry.category);
    if (mapped) setCat(mapped);
  }

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;

    let resolvedIngredientId = ingredientId;

    if (!resolvedIngredientId) {
      try {
        resolvedIngredientId = await resolveOrCreateIngredient(trimmed);
      } catch {
        toast.error("Couldn't save ingredient");
        return;
      }
    }

    try {
      await addPantryItem({
        name: trimmed,
        qty,
        unit,
        cat,
        on: true,
        ingredientId: resolvedIngredientId,
      });
      trackEvent("pantry_item_added", undefined);
    } catch {
      toast.error("Couldn't save ingredient");
      return;
    }

    onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <div
      data-testid="add-item-sheet"
      className="fixed inset-0 z-[500] flex flex-col justify-end"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute inset-0 bg-black/50 border-none cursor-pointer"
      />

      <div className="relative bg-[rgba(14,10,4,0.96)] border border-[rgba(255,200,100,0.2)] rounded-t-[24px] px-5 py-6 flex flex-col gap-4">
        <h2 className="font-sans text-xl font-bold text-[var(--fg-1)] m-0">
          Add to Pantry
        </h2>

        <IngredientAutocomplete
          value={name}
          onChange={handleNameChange}
          onSelect={handleSelect}
          placeholder="Ingredient name"
        />

        {/* Qty + unit row */}
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            value={qty}
            onChange={(event) => setQty(Number(event.target.value))}
            className={`${FIELD_CLASS} w-20 shrink-0`}
          />
          <select
            value={unit}
            onChange={(event) => setUnit(event.target.value as UnitOption)}
            className={`${FIELD_CLASS} flex-1`}
          >
            {UNIT_OPTIONS.map((unitOption) => (
              <option key={unitOption} value={unitOption}>
                {unitOption}
              </option>
            ))}
          </select>
        </div>

        {/* Category chips */}
        <div className="flex gap-1.5 flex-wrap">
          {CAT_OPTIONS.map((catOption) => (
            <button
              key={catOption}
              type="button"
              onClick={() => setCat(catOption)}
              className={`py-[5px] px-3 rounded-full border font-sans text-xs font-medium cursor-pointer ${
                cat === catOption
                  ? "border-[rgba(251,191,36,0.6)] bg-[rgba(251,191,36,0.15)] text-[var(--fg-1)]"
                  : "border-[rgba(255,200,100,0.2)] bg-transparent text-[var(--fg-3)]"
              }`}
            >
              {catOption}
            </button>
          ))}
        </div>

        {/* Submit */}
        <button
          type="button"
          data-testid="add-item-submit"
          onClick={handleSubmit}
          disabled={!name.trim()}
          className={`p-3.5 rounded-[14px] border-none bg-[rgba(251,191,36,0.9)] text-[#1a0f00] font-sans text-base font-bold ${
            name.trim()
              ? "cursor-pointer opacity-100"
              : "cursor-not-allowed opacity-50"
          }`}
        >
          Add to Pantry
        </button>
      </div>
    </div>,
    document.body,
  );
}
