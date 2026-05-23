"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Fuse from "fuse.js";
import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui";
import { db } from "@/lib/db/db";
import type { VocabularyIngredient } from "@/lib/db/schema";

interface IngredientAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
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
  placeholder,
  error,
}: IngredientAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const vocab = useLiveQuery(
    () =>
      db.ingredients
        .filter((v) => !v.status || v.status === "confirmed")
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
      .map((r) => r.item);
  }, [fuse, value]);

  const script = useMemo(() => detectScript(value), [value]);

  function getDisplayName(entry: VocabularyIngredient): string {
    if (script === "cyrillic" && entry.ua) return entry.ua;
    return entry.en;
  }

  function select(entry: VocabularyIngredient) {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    onChange(getDisplayName(entry));
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
    setOpen(e.target.value.trim().length > 0);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!open || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      select(results[activeIndex]);
    }
  }

  function handleBlur() {
    blurTimerRef.current = setTimeout(() => {
      setOpen(false);
      setActiveIndex(-1);
    }, 150);
  }

  function handleMouseDown(e: React.MouseEvent, entry: VocabularyIngredient) {
    e.preventDefault();
    select(entry);
  }

  return (
    <div style={{ position: "relative" }}>
      <Input
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        error={error}
      />
      {open && results.length > 0 && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "var(--bg-2)",
            border: "1px solid rgba(255,200,100,0.2)",
            borderRadius: 10,
            marginTop: 4,
            padding: "4px 0",
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {results.map((entry, idx) => (
            <div
              key={entry.id}
              role="option"
              tabIndex={-1}
              aria-selected={idx === activeIndex}
              onMouseDown={(e) => handleMouseDown(e, entry)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                background:
                  idx === activeIndex ? "rgba(255,180,60,0.12)" : "transparent",
                color: "var(--fg-1)",
                fontSize: "var(--text-base)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {getDisplayName(entry)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
