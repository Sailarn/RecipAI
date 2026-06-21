"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Search, X } from "lucide-react";
import { motion } from "motion/react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Locale } from "@/i18n/config";
import { db } from "@/lib/db/db";
import { INGREDIENT_STATUS, type VocabularyIngredient } from "@/lib/db/schema";
import { CAT_OPTIONS, type CatOption, mapVocabCategory } from "./categories";
import { CATEGORY_STYLES } from "./category-styles";
import { getIngredientDisplayName } from "./display-name";
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

// Multi-select commit bar — pantry passes this to bulk-add. Omit it (and pass
// `onPick`) for single-select, where tapping a tile fires immediately.
interface CommitConfig {
  label: (count: number) => string;
  onCommit: (ingredients: VocabularyIngredient[]) => void;
}

interface IngredientPickerProps {
  title: string;
  onClose: () => void;
  // Single-select: fired the moment a tile is tapped; the caller closes.
  onPick?: (ingredient: VocabularyIngredient) => void;
  // Multi-select: tiles toggle into a selection committed via the bottom bar.
  commit?: CommitConfig;
  // Rendered as non-selectable "added" tiles (e.g. items already in the pantry).
  disabledIngredientIds?: Set<string>;
  // Rendered with the "selected" look but still tappable (e.g. ingredients
  // already used in the recipe being edited).
  markedIngredientIds?: Set<string>;
  testId?: string;
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

export function IngredientPicker({
  title,
  onClose,
  onPick,
  commit,
  disabledIngredientIds,
  markedIngredientIds,
  testId = "ingredient-picker",
}: IngredientPickerProps) {
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

  function handleTileClick(ingredient: VocabularyIngredient) {
    if (disabledIngredientIds?.has(ingredient.id)) return;

    if (onPick) {
      onPick(ingredient);
      return;
    }

    setSelectedIngredientIds((currentIngredientIds) => {
      const nextIngredientIds = new Set(currentIngredientIds);
      if (nextIngredientIds.has(ingredient.id)) {
        nextIngredientIds.delete(ingredient.id);
      } else {
        nextIngredientIds.add(ingredient.id);
      }
      return nextIngredientIds;
    });
  }

  function handleCommit() {
    if (!commit) return;
    const picked = vocabulary.filter((ingredient) =>
      selectedIngredientIds.has(ingredient.id),
    );
    commit.onCommit(picked);
  }

  function renderTile(ingredient: VocabularyIngredient, category: CatOption) {
    return (
      <IngredientTile
        key={ingredient.id}
        displayName={getIngredientDisplayName(ingredient, locale)}
        categoryStyle={CATEGORY_STYLES[category]}
        isAdded={disabledIngredientIds?.has(ingredient.id) ?? false}
        isSelected={
          selectedIngredientIds.has(ingredient.id) ||
          (markedIngredientIds?.has(ingredient.id) ?? false)
        }
        onToggle={() => handleTileClick(ingredient)}
      />
    );
  }

  // SSR guard only — this component is rendered client-side on interaction, so
  // a non-rendering check keeps motion's first mount intact (a useEffect/state
  // gate would delay the mount past AnimatePresence's enter, flashing the panel
  // in at its final position before it slides).
  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      data-testid={testId}
      className="fixed inset-0 z-[1000] isolate flex flex-col overflow-hidden bg-[#080808]"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={SLIDE_TRANSITION}
      onAnimationComplete={() => setContentReady(true)}
    >
      <div
        data-testid={`${testId}-mesh`}
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none [background:var(--app-mesh)]"
      />

      <div className="relative z-10 shrink-0 px-4 pb-3 pt-[max(20px,calc(env(safe-area-inset-top)+8px))] flex items-center gap-3">
        <h2 className="flex-1 font-display font-bold text-[21px] text-[var(--fg-1)] m-0 leading-[1.2]">
          {title}
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
                  {filteredIngredients.map((ingredient) =>
                    renderTile(
                      ingredient,
                      mapVocabCategory(ingredient.category) ?? "Other",
                    ),
                  )}
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
                      {items.map((ingredient) =>
                        renderTile(ingredient, category),
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </div>

      {commit && (
        <div
          data-testid={`${testId}-commit-bar`}
          className="relative z-10 shrink-0 px-4 pb-[max(26px,calc(env(safe-area-inset-bottom)+16px))] pt-3 bg-[linear-gradient(to_top,rgba(8,8,8,0.97)_60%,transparent)]"
        >
          <button
            type="button"
            data-testid={`${testId}-commit`}
            onClick={handleCommit}
            disabled={selectedIngredientIds.size === 0}
            className={`w-full p-4 rounded-[16px] font-sans text-base font-bold transition-opacity ${
              selectedIngredientIds.size > 0
                ? "bg-[linear-gradient(135deg,rgba(251,191,36,0.95),oklch(0.72_0.17_45))] text-[#1a1208] cursor-pointer opacity-100 shadow-[0_6px_22px_rgba(251,191,36,0.35)]"
                : "bg-[rgba(255,200,100,0.12)] text-[var(--fg-3)] cursor-not-allowed opacity-60"
            }`}
          >
            {commit.label(selectedIngredientIds.size)}
          </button>
        </div>
      )}
    </motion.div>,
    document.body,
  );
}
