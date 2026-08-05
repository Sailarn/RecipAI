"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Search } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { db } from "@/lib/db/db";
import type { PantryItem } from "@/lib/db/schema";
import { AddPantryPicker } from "./add-pantry-picker";
import { localizedPantryName } from "./localized-name";
import { PantryRow } from "./pantry-row";

// Subtitle: "N in stock · M to buy"
function buildSubtitle(
  items: PantryItem[],
  t: (key: string, values?: Record<string, number>) => string,
): string {
  const inStock = items.filter((item) => item.on).length;
  const outOfStock = items.filter((item) => !item.on).length;
  const parts: string[] = [];
  if (inStock > 0) parts.push(t("inStock", { count: inStock }));
  if (outOfStock > 0) parts.push(t("toBuy", { count: outOfStock }));
  return parts.join(" · ") || t("emptyShort");
}

export function PantryPage() {
  const tPantry = useTranslations("pantry");
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";
  const items = useLiveQuery(() => db.pantry.toArray(), []) ?? [];
  const vocabItems = useLiveQuery(() => db.ingredients.toArray(), []);
  const vocabById = useMemo(
    () => new Map((vocabItems ?? []).map((vocab) => [vocab.id, vocab])),
    [vocabItems],
  );

  const [showAddPicker, setShowAddPicker] = useState(false);
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const filtered = query
    ? items.filter((item) => {
        if (item.name.toLowerCase().includes(query)) return true;
        const vocab = vocabById.get(item.ingredientId ?? "");
        return (
          vocab?.en?.toLowerCase().includes(query) ||
          (vocab?.ua?.toLowerCase().includes(query) ?? false)
        );
      })
    : items;

  const inStock = filtered.filter((item) => item.on);
  const outOfStock = filtered.filter((item) => !item.on);

  return (
    // position:relative so the FAB (position:absolute) anchors to this container,
    // not the viewport — necessary because PageStack's willChange:transform breaks
    // position:fixed inside it.
    <div className="relative h-dvh flex flex-col bg-[var(--bg)]">
      {/* Header — stays pinned at the top */}
      <div className="shrink-0 px-5 pb-4 pt-[max(20px,calc(env(safe-area-inset-top)+8px))]">
        <h1 className="font-display font-extrabold text-[28px] text-[var(--fg-1)] m-0 leading-[1.2]">
          Pantry
        </h1>
        <p
          data-testid="pantry-subtitle"
          className="font-sans text-[13px] text-[var(--fg-3)] mt-1"
        >
          {buildSubtitle(items, tPantry)}
        </p>

        {/* Search */}
        {items.length > 0 && (
          <div className="relative mt-3">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)] pointer-events-none"
            />
            <input
              type="search"
              placeholder={tPantry("searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              // text-base (16px) keeps iOS Safari from auto-zooming on focus
              className="w-full py-2.5 pl-[34px] pr-3 bg-[rgba(255,200,100,0.06)] border border-[rgba(255,200,100,0.14)] rounded-xl text-[var(--fg-1)] font-sans text-base outline-none box-border"
            />
          </div>
        )}
      </div>

      {/* Scrollable list area */}
      <div
        className="flex-1 overflow-y-auto pb-25"
        style={{ WebkitOverflowScrolling: "touch" as never }}
      >
        {/* Empty state — no items at all */}
        {items.length === 0 && (
          <div
            data-testid="pantry-empty"
            className="flex flex-col items-center justify-center px-6 py-16 gap-3 text-[var(--fg-3)] font-sans text-[15px] text-center"
          >
            <span className="text-[40px]">🧺</span>
            <p className="m-0">{tPantry("empty")}</p>
            <p className="m-0 text-[13px]">{tPantry("emptyHint")}</p>
          </div>
        )}

        {/* No search results */}
        {items.length > 0 && query && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-12 gap-2 text-[var(--fg-3)] font-sans text-sm text-center">
            <p className="m-0">No ingredients match "{search}"</p>
          </div>
        )}

        {/* In-stock items */}
        {inStock.length > 0 && (
          <div className="glass-card mx-4 mb-3 rounded-[18px] overflow-hidden">
            {inStock.map((item) => (
              <PantryRow
                key={item.id}
                item={item}
                name={localizedPantryName(item, vocabById, locale)}
              />
            ))}
          </div>
        )}

        {/* Out-of-stock divider + items */}
        {outOfStock.length > 0 && (
          <>
            {inStock.length > 0 && (
              <p className="mx-5 mb-2 text-[11px] font-semibold text-[var(--fg-3)] uppercase tracking-[0.08em] font-sans">
                Out of stock
              </p>
            )}
            <div className="glass-card mx-4 mb-3 rounded-[18px] overflow-hidden">
              {outOfStock.map((item) => (
                <PantryRow
                  key={item.id}
                  item={item}
                  name={localizedPantryName(item, vocabById, locale)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* FAB — anchored to the page container, not the viewport */}
      <button
        type="button"
        data-testid="add-pantry-item"
        onClick={() => setShowAddPicker(true)}
        aria-label={tPantry("addItem")}
        className="absolute right-5 bottom-25 w-13 h-13 rounded-full bg-[rgba(251,191,36,0.9)] border-none cursor-pointer flex items-center justify-center shadow-[0_4px_20px_rgba(251,191,36,0.35)] z-[100]"
      >
        <Plus size={22} className="text-[#1a0f00]" />
      </button>

      {/* Fullscreen picker */}
      <AnimatePresence>
        {showAddPicker && (
          <AddPantryPicker
            key="add-pantry-picker"
            onClose={() => setShowAddPicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
