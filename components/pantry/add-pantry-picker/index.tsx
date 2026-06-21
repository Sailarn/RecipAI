"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Search, X } from "lucide-react";
import { motion } from "motion/react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Locale } from "@/i18n/config";
import { db } from "@/lib/db/db";
import { addPantryItem } from "@/lib/db/pantry";
import { INGREDIENT_STATUS, type VocabularyIngredient } from "@/lib/db/schema";
import { trackEvent } from "@/lib/telemetry";
import { CAT_OPTIONS, type CatOption, mapVocabCategory } from "../constants";
import { CATEGORY_STYLES } from "./category-styles";
import { IngredientTile } from "./ingredient-tile";
import { PickerSkeleton } from "./picker-skeleton";

const SLIDE_TRANSITION = {
  type: "tween" as const,
  duration: 0.32,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
};

// The ingredient grid is the full confirmed vocabulary — taller than the
// viewport and heavy to rasterize. Rendering it while the panel slides forces
// the browser to composite that whole layer on the first frame, which stutters
// on large desktop viewports. We mount it only once the slide settles, then
// fade it in so it doesn't pop.
const CONTENT_FADE = { duration: 0.18 };

function getDisplayName(
  ingredient: VocabularyIngredient,
  locale: Locale,
): string {
  return locale === "ua"
    ? (ingredient.ua ?? ingredient.en)
    : (ingredient.en ?? ingredient.ua ?? "");
}

function matchesSearch(
  ingredient: VocabularyIngredient,
  query: string,
): boolean {
  return (
    ingredient.en.toLowerCase().includes(query) ||
    (ingredient.ua?.toLowerCase().includes(query) ?? false) ||
    ingredient.aliasesEn.some((alias) => alias.toLowerCase().includes(query)) ||
    ingredient.aliasesUa.some((alias) => alias.toLowerCase().includes(query))
  );
}

export function AddPantryPicker({ onClose }: { onClose: () => void }) {
  const { locale = "en" } = useParams<{ locale: Locale }>();

  const [search, setSearch] = useState("");
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<
    Set<string>
  >(new Set());
  const [contentReady, setContentReady] = useState(false);

  const vocabularyQuery = useLiveQuery(
    () =>
      db.ingredients
        .filter(
          (vocab) =>
            !vocab.status || vocab.status === INGREDIENT_STATUS.CONFIRMED,
        )
        .toArray(),
    [],
  );

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

  const vocabulary = vocabularyQuery ?? [];
  const query = search.trim().toLowerCase();

  const filteredIngredients = query
    ? vocabulary.filter((ingredient) => matchesSearch(ingredient, query))
    : null;

  const groupedIngredients = useMemo<
    Record<CatOption, VocabularyIngredient[]>
  >(() => {
    const groups = Object.fromEntries(
      CAT_OPTIONS.map((category) => [category, [] as VocabularyIngredient[]]),
    ) as Record<CatOption, VocabularyIngredient[]>;

    for (const ingredient of vocabulary) {
      const category = mapVocabCategory(ingredient.category) ?? "Other";
      groups[category].push(ingredient);
    }

    return groups;
  }, [vocabulary]);

  function toggleIngredient(ingredientId: string) {
    if (addedIngredientIds.has(ingredientId)) return;
    setSelectedIngredientIds((currentIngredientIds) => {
      const nextIngredientIds = new Set(currentIngredientIds);
      if (nextIngredientIds.has(ingredientId)) {
        nextIngredientIds.delete(ingredientId);
      } else {
        nextIngredientIds.add(ingredientId);
      }
      return nextIngredientIds;
    });
  }

  async function handleCommit() {
    for (const ingredientId of selectedIngredientIds) {
      const ingredient = vocabulary.find((entry) => entry.id === ingredientId);
      if (!ingredient) continue;
      await addPantryItem({
        name: getDisplayName(ingredient, locale),
        ingredientId,
        on: true,
      });
      trackEvent("pantry_item_added", undefined);
    }
    onClose();
  }

  // SSR guard only — this component is rendered client-side on interaction, so
  // a non-rendering check keeps motion's first mount intact (a useEffect/state
  // gate would delay the mount past AnimatePresence's enter, flashing the panel
  // in at its final position before it slides).
  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      data-testid="add-pantry-picker"
      className="fixed inset-0 z-[1000] isolate flex flex-col overflow-hidden bg-[#080808]"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={SLIDE_TRANSITION}
      onAnimationComplete={() => setContentReady(true)}
    >
      <div
        data-testid="pantry-picker-mesh"
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none [background:var(--app-mesh)]"
      />

      <div className="relative z-10 shrink-0 px-4 pb-3 pt-[max(20px,calc(env(safe-area-inset-top)+8px))] flex items-center gap-3">
        <h2 className="flex-1 font-display font-bold text-[21px] text-[var(--fg-1)] m-0 leading-[1.2]">
          Add to Pantry
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 rounded-full bg-[rgba(255,200,100,0.08)] border border-[rgba(255,200,100,0.15)] flex items-center justify-center text-[var(--fg-3)] cursor-pointer shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      <div className="relative z-10 shrink-0 px-4 pb-3">
        <div className="flex items-center gap-2.5 px-3.5 rounded-[14px] bg-[rgba(255,255,255,0.04)] border border-[var(--border-subtle)]">
          <Search size={17} className="shrink-0 text-[var(--fg-2)]" />
          <input
            type="search"
            placeholder="Search ingredients…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search ingredients"
            className="w-full py-3 bg-transparent border-0 text-[var(--fg-1)] placeholder:text-[var(--fg-3)] font-sans text-base outline-none box-border"
          />
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-5">
        {!contentReady && <PickerSkeleton />}
        {contentReady && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={CONTENT_FADE}
          >
            {filteredIngredients ? (
              filteredIngredients.length === 0 ? (
                <p className="text-center text-[var(--fg-3)] font-sans text-sm py-8 m-0">
                  No ingredients match &ldquo;{search}&rdquo;
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {filteredIngredients.map((ingredient) => {
                    const category =
                      mapVocabCategory(ingredient.category) ?? "Other";
                    return (
                      <IngredientTile
                        key={ingredient.id}
                        displayName={getDisplayName(ingredient, locale)}
                        categoryStyle={CATEGORY_STYLES[category]}
                        isAdded={addedIngredientIds.has(ingredient.id)}
                        isSelected={selectedIngredientIds.has(ingredient.id)}
                        onToggle={() => toggleIngredient(ingredient.id)}
                      />
                    );
                  })}
                </div>
              )
            ) : (
              CAT_OPTIONS.map((category) => {
                const items = groupedIngredients[category];
                if (items.length === 0) return null;
                return (
                  <div key={category} className="mb-[18px]">
                    <h3 className="flex items-center gap-[7px] px-0.5 pt-2 pb-[11px] font-sans text-xs font-bold uppercase tracking-[0.07em] text-[var(--fg-2)] m-0">
                      <span
                        aria-hidden="true"
                        className={`size-[7px] rounded-full shrink-0 ${CATEGORY_STYLES[category].dot}`}
                      />
                      <span>{category}</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-[9px]">
                      {items.map((ingredient) => (
                        <IngredientTile
                          key={ingredient.id}
                          displayName={getDisplayName(ingredient, locale)}
                          categoryStyle={CATEGORY_STYLES[category]}
                          isAdded={addedIngredientIds.has(ingredient.id)}
                          isSelected={selectedIngredientIds.has(ingredient.id)}
                          onToggle={() => toggleIngredient(ingredient.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </div>

      <div
        data-testid="pantry-picker-commit-bar"
        className="relative z-10 shrink-0 px-4 pb-[max(26px,calc(env(safe-area-inset-bottom)+16px))] pt-3 bg-[linear-gradient(to_top,rgba(8,8,8,0.97)_60%,transparent)]"
      >
        <button
          type="button"
          data-testid="pantry-picker-commit"
          onClick={handleCommit}
          disabled={selectedIngredientIds.size === 0}
          className={`w-full p-4 rounded-[16px] font-sans text-base font-bold transition-opacity ${
            selectedIngredientIds.size > 0
              ? "bg-[linear-gradient(135deg,rgba(251,191,36,0.95),oklch(0.72_0.17_45))] text-[#1a1208] cursor-pointer opacity-100 shadow-[0_6px_22px_rgba(251,191,36,0.35)]"
              : "bg-[rgba(255,200,100,0.12)] text-[var(--fg-3)] cursor-not-allowed opacity-60"
          }`}
        >
          {selectedIngredientIds.size > 0
            ? `Add ${selectedIngredientIds.size} item${selectedIngredientIds.size === 1 ? "" : "s"} to Pantry`
            : "Add items to Pantry"}
        </button>
      </div>
    </motion.div>,
    document.body,
  );
}
