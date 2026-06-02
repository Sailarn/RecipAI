"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Fuse from "fuse.js";
import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui";
import { db } from "@/lib/db/db";
import { INGREDIENT_STATUS, type VocabularyIngredient } from "@/lib/db/schema";

interface IngredientAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (entry: VocabularyIngredient) => void;
  placeholder?: string;
  error?: boolean;
}

function detectScript(text: string): "cyrillic" | "latin" {
  let cyrillic = 0;
  let latin = 0;
  for (const ch of text) {
    if (/[Ѐ-ӿ]/u.test(ch)) cyrillic++;
    else if (/[a-zA-Z]/u.test(ch)) latin++;
  }
  return cyrillic >= latin ? "cyrillic" : "latin";
}

const MAX_RESULTS = 5;
const FUSE_THRESHOLD = 0.35;

export function IngredientAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  error,
}: IngredientAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const vocab = useLiveQuery(
    () =>
      db.ingredients
        .filter(
          (ingredient) =>
            !ingredient.status ||
            ingredient.status === INGREDIENT_STATUS.CONFIRMED,
        )
        .toArray(),
    [],
  );

  const fuse = useMemo(() => {
    if (!vocab) return null;
    return new Fuse(vocab, {
      keys: ["en", "ua", "aliasesEn", "aliasesUa"],
      threshold: FUSE_THRESHOLD,
      includeScore: true,
    });
  }, [vocab]);

  const results = useMemo<VocabularyIngredient[]>(() => {
    if (!fuse || !value.trim()) return [];
    return fuse
      .search(value.trim())
      .slice(0, MAX_RESULTS)
      .map((fuseResult) => fuseResult.item);
  }, [fuse, value]);

  const script = useMemo(() => detectScript(value), [value]);

  function getDisplayName(entry: VocabularyIngredient): string {
    if (script === "cyrillic" && entry.ua) return entry.ua;
    return entry.en;
  }

  function openDropdown() {
    if (anchorRef.current) {
      setDropdownRect(anchorRef.current.getBoundingClientRect());
    }
    setOpen(true);
  }

  function select(entry: VocabularyIngredient) {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    onChange(getDisplayName(entry));
    setOpen(false);
    setActiveIndex(-1);
    onSelect?.(entry);
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
    if (event.target.value.trim().length > 0) {
      openDropdown();
    } else {
      setOpen(false);
    }
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!open || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      select(results[activeIndex]);
    }
  }

  function handleBlur() {
    blurTimerRef.current = setTimeout(() => {
      setOpen(false);
      setActiveIndex(-1);
    }, 150);
  }

  function handleMouseDown(
    event: React.MouseEvent,
    entry: VocabularyIngredient,
  ) {
    event.preventDefault();
    select(entry);
  }

  const dropdown =
    open && results.length > 0 && dropdownRect
      ? createPortal(
          <div
            role="listbox"
            className="fixed z-[9999] bg-[var(--bg-card)] border border-[rgba(255,200,100,0.25)] rounded-[10px] py-1 max-h-[200px] overflow-y-auto shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
            style={{
              top: dropdownRect.bottom + 4,
              left: dropdownRect.left,
              width: dropdownRect.width,
            }}
          >
            {results.map((entry, index) => (
              <div
                key={entry.id}
                role="option"
                tabIndex={-1}
                aria-selected={index === activeIndex}
                onMouseDown={(event) => handleMouseDown(event, entry)}
                className={`px-3 py-2 cursor-pointer text-[var(--fg-1)] text-[length:var(--text-base)] font-sans ${
                  index === activeIndex
                    ? "bg-[rgba(255,180,60,0.12)]"
                    : "bg-transparent"
                }`}
              >
                {getDisplayName(entry)}
              </div>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={anchorRef}>
      <Input
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        error={error}
      />
      {dropdown}
    </div>
  );
}
