"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { IngredientAutocomplete } from "@/components/ingredient-autocomplete";
import { db } from "@/lib/db/db";
import { createProvisionalIngredient } from "@/lib/db/ingredients";
import {
  addPantryItem,
  removePantryItem,
  togglePantryItem,
} from "@/lib/db/pantry";
import type { PantryItem, VocabularyIngredient } from "@/lib/db/schema";

const UNIT_OPTIONS = ["pcs", "g", "kg", "ml", "l", "tbsp", "tsp"] as const;
const CAT_OPTIONS = [
  "Produce",
  "Dairy",
  "Pantry",
  "Spices",
  "Frozen",
  "Other",
] as const;

type UnitOption = (typeof UNIT_OPTIONS)[number];
type CatOption = (typeof CAT_OPTIONS)[number];

const VOCAB_CATEGORY_MAP: Record<string, CatOption> = {
  Produce: "Produce",
  Vegetable: "Produce",
  Fruit: "Produce",
  Dairy: "Dairy",
  "Dairy & Eggs": "Dairy",
  Meat: "Other",
  Seafood: "Other",
  Grain: "Pantry",
  Legume: "Pantry",
  Spice: "Spices",
  Herb: "Spices",
  Oil: "Pantry",
  Sauce: "Pantry",
  Sweetener: "Pantry",
  Frozen: "Frozen",
  Other: "Other",
};

function mapVocabCategory(vocabCat: string): CatOption | null {
  return (VOCAB_CATEGORY_MAP[vocabCat] as CatOption) ?? null;
}

// Subtitle: "N in stock · M to buy"
function subtitle(items: PantryItem[]): string {
  const inStock = items.filter((i) => i.on).length;
  const outOfStock = items.filter((i) => !i.on).length;
  const parts: string[] = [];
  if (inStock > 0) parts.push(`${inStock} in stock`);
  if (outOfStock > 0) parts.push(`${outOfStock} to buy`);
  return parts.join(" · ") || "Empty pantry";
}

function PantryRow({ item }: { item: PantryItem }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderBottom: "1px solid rgba(255,200,100,0.08)",
      }}
    >
      {/* Checkbox toggle */}
      <button
        type="button"
        data-testid={`toggle-${item.id}`}
        onClick={() => togglePantryItem(item.id)}
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          border: `2px solid ${item.on ? "rgba(251,191,36,0.8)" : "rgba(255,200,100,0.3)"}`,
          background: item.on ? "rgba(251,191,36,0.2)" : "transparent",
          flexShrink: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          transition: "all 0.15s ease",
        }}
        aria-label={item.on ? "Mark as out of stock" : "Mark as in stock"}
      >
        {item.on ? "✓" : ""}
      </button>

      {/* Name + category */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            fontWeight: 500,
            color: item.on ? "var(--fg-1)" : "var(--fg-3)",
            textDecoration: item.on ? "none" : "line-through",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--fg-3)",
            fontFamily: "var(--font-sans)",
            marginTop: 1,
          }}
        >
          {item.cat} · {item.qty} {item.unit}
        </div>
      </div>

      {/* Delete button */}
      <button
        type="button"
        data-testid={`delete-${item.id}`}
        onClick={async () => {
          await removePantryItem(item.id);
          toast.success(`${item.name} removed`);
        }}
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          border: "1px solid rgba(239,68,68,0.3)",
          background: "rgba(239,68,68,0.08)",
          color: "#ef4444",
          cursor: "pointer",
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
        aria-label={`Remove ${item.name}`}
      >
        ×
      </button>
    </div>
  );
}

interface AddItemSheetProps {
  onClose: () => void;
}

function AddItemSheet({ onClose }: AddItemSheetProps) {
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
        resolvedIngredientId = await createProvisionalIngredient(trimmed);
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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          border: "none",
          cursor: "pointer",
        }}
        aria-label="Close"
      />

      {/* Sheet */}
      <div
        style={{
          position: "relative",
          background: "rgba(14,10,4,0.96)",
          border: "1px solid rgba(255,200,100,0.2)",
          borderRadius: "24px 24px 0 0",
          padding: "24px 20px",
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 20,
            fontWeight: 700,
            color: "var(--fg-1)",
            margin: 0,
          }}
        >
          Add to Pantry
        </h2>

        {/* Name autocomplete */}
        <IngredientAutocomplete
          value={name}
          onChange={handleNameChange}
          onSelect={handleSelect}
          placeholder="Ingredient name"
        />

        {/* Qty + unit row */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            min={0}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            style={{
              width: 80,
              padding: "10px 12px",
              background: "rgba(255,200,100,0.06)",
              border: "1px solid rgba(255,200,100,0.2)",
              borderRadius: 12,
              color: "var(--fg-1)",
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              flexShrink: 0,
            }}
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as UnitOption)}
            style={{
              flex: 1,
              padding: "10px 12px",
              background: "rgba(255,200,100,0.06)",
              border: "1px solid rgba(255,200,100,0.2)",
              borderRadius: 12,
              color: "var(--fg-1)",
              fontFamily: "var(--font-sans)",
              fontSize: 15,
            }}
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        {/* Category chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CAT_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              style={{
                padding: "5px 12px",
                borderRadius: 99,
                border: `1px solid ${cat === c ? "rgba(251,191,36,0.6)" : "rgba(255,200,100,0.2)"}`,
                background: cat === c ? "rgba(251,191,36,0.15)" : "transparent",
                color: cat === c ? "var(--fg-1)" : "var(--fg-3)",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Submit */}
        <button
          type="button"
          data-testid="add-item-submit"
          onClick={handleSubmit}
          disabled={!name.trim()}
          style={{
            padding: "14px",
            borderRadius: 14,
            border: "none",
            background: "rgba(251,191,36,0.9)",
            color: "#1a0f00",
            fontFamily: "var(--font-sans)",
            fontSize: 16,
            fontWeight: 700,
            cursor: name.trim() ? "pointer" : "not-allowed",
            opacity: name.trim() ? 1 : 0.5,
          }}
        >
          Add to Pantry
        </button>
      </div>
    </div>,
    document.body,
  );
}

export function PantryPage() {
  const items = useLiveQuery(() => db.pantry.toArray(), []) ?? [];
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const filtered = query
    ? items.filter((i) => i.name.toLowerCase().includes(query))
    : items;

  const inStock = filtered.filter((i) => i.on);
  const outOfStock = filtered.filter((i) => !i.on);

  return (
    // position:relative so the FAB (position:absolute) anchors to this container,
    // not the viewport — necessary because PageStack's willChange:transform breaks
    // position:fixed inside it.
    <div
      style={{
        position: "relative",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
      }}
    >
      {/* Header — stays pinned at the top */}
      <div
        style={{
          flexShrink: 0,
          padding: "max(20px, calc(env(safe-area-inset-top) + 8px)) 20px 16px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 28,
            color: "var(--fg-1)",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Pantry
        </h1>
        <p
          data-testid="pantry-subtitle"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            color: "var(--fg-3)",
            margin: "4px 0 0",
          }}
        >
          {subtitle(items)}
        </p>

        {/* Search */}
        {items.length > 0 && (
          <div
            style={{
              position: "relative",
              marginTop: 12,
            }}
          >
            <Search
              size={15}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--fg-3)",
                pointerEvents: "none",
              }}
            />
            <input
              type="search"
              placeholder="Search pantry…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px 9px 34px",
                background: "rgba(255,200,100,0.06)",
                border: "1px solid rgba(255,200,100,0.14)",
                borderRadius: 12,
                color: "var(--fg-1)",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}
      </div>

      {/* Scrollable list area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch" as never,
          paddingBottom: "max(100px, calc(env(safe-area-inset-bottom) + 80px))",
        }}
      >
        {/* Empty state — no items at all */}
        {items.length === 0 && (
          <div
            data-testid="pantry-empty"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "64px 24px",
              gap: 12,
              color: "var(--fg-3)",
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: 40 }}>🧺</span>
            <p style={{ margin: 0 }}>Your pantry is empty.</p>
            <p style={{ margin: 0, fontSize: 13 }}>
              Tap + to add ingredients you have at home.
            </p>
          </div>
        )}

        {/* No search results */}
        {items.length > 0 && query && filtered.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "48px 24px",
              gap: 8,
              color: "var(--fg-3)",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0 }}>No ingredients match "{search}"</p>
          </div>
        )}

        {/* In-stock items */}
        {inStock.length > 0 && (
          <div
            className="glass-card"
            style={{
              margin: "0 16px 12px",
              borderRadius: 18,
              overflow: "hidden",
            }}
          >
            {inStock.map((item) => (
              <PantryRow key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* Out-of-stock divider + items */}
        {outOfStock.length > 0 && (
          <>
            {inStock.length > 0 && (
              <p
                style={{
                  margin: "0 20px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--fg-3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Out of stock
              </p>
            )}
            <div
              className="glass-card"
              style={{
                margin: "0 16px 12px",
                borderRadius: 18,
                overflow: "hidden",
              }}
            >
              {outOfStock.map((item) => (
                <PantryRow key={item.id} item={item} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* FAB — anchored to the page container, not the viewport */}
      <button
        type="button"
        data-testid="add-pantry-item"
        onClick={() => setShowAddSheet(true)}
        style={{
          position: "absolute",
          right: 20,
          bottom: "calc(env(safe-area-inset-bottom) + 88px)",
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "rgba(251,191,36,0.9)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(251,191,36,0.35)",
          zIndex: 100,
        }}
        aria-label="Add pantry item"
      >
        <Plus size={22} style={{ color: "#1a0f00" }} />
      </button>

      {/* Add item sheet */}
      {showAddSheet && <AddItemSheet onClose={() => setShowAddSheet(false)} />}
    </div>
  );
}
