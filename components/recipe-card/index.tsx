"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { AddToCollectionSheet } from "@/components/add-to-collection-sheet";
import { RecipeCardContextMenu } from "@/components/recipe-card-context-menu";
import { RecipeDetail } from "@/components/recipe-detail";
import { RecipeImage } from "@/components/recipe-image";
import { Badge } from "@/components/ui/badge";
import { useLongPress } from "@/hooks/use-long-press";
import { deleteRecipe, updateRecipe } from "@/lib/db/recipes";
import type { Collection, Recipe } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

interface RecipeCardProps {
  recipe: Recipe;
  collections: Collection[];
  priority?: boolean;
}

export function RecipeCard({
  recipe,
  collections,
  priority = false,
}: RecipeCardProps) {
  const params = useParams();
  const locale = params.locale as string;
  const navigate = useNavigate();
  const t = useTranslations("recipes");
  const [hovered, setHovered] = useState(false);

  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [showCollectionSheet, setShowCollectionSheet] = useState(false);
  const didLongPress = useRef(false);

  const handleLongPress = useCallback(() => {
    didLongPress.current = true;
    setMenuPos({
      x: window.innerWidth / 2 - 95,
      y: window.innerHeight / 2 - 80,
    });
  }, []);

  const longPressHandlers = useLongPress(handleLongPress, () => {
    didLongPress.current = false;
  });

  async function handleToggleStatus() {
    const next = recipe.status === "tried" ? null : "tried";
    await updateRecipe(recipe.id, { status: next });
  }

  async function handleAddToCollection(collectionId: string) {
    const current = recipe.collectionIds ?? [];
    const updated = current.includes(collectionId)
      ? current.filter((id) => id !== collectionId)
      : [...current, collectionId];
    await updateRecipe(recipe.id, { collectionIds: updated });
  }

  async function handleDelete() {
    await deleteRecipe(recipe.id);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (didLongPress.current) {
            didLongPress.current = false;
            return;
          }
          navigate.push(
            routes.recipes.detail(locale, recipe.id),
            <RecipeDetail recipeId={recipe.id} locale={locale} />,
          );
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          longPressHandlers.onMouseLeave();
        }}
        onMouseDown={longPressHandlers.onMouseDown}
        onMouseUp={longPressHandlers.onMouseUp}
        onTouchStart={longPressHandlers.onTouchStart}
        onTouchEnd={longPressHandlers.onTouchEnd}
        onTouchMove={longPressHandlers.onTouchMove}
        onContextMenu={longPressHandlers.onContextMenu}
        className="glass-card cursor-pointer h-full flex flex-col gap-0 overflow-hidden"
        style={{
          background: "none",
          border: "none",
          padding: 0,
          textAlign: "left",
          borderRadius: 22,
          userSelect: "none",
          WebkitTouchCallout: "none",
          transform: hovered ? "translateY(-2px)" : "none",
          boxShadow: hovered
            ? "0 8px 36px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,220,130,0.18)"
            : undefined,
          borderColor: hovered ? "rgba(255,210,130,0.28)" : undefined,
          transition:
            "box-shadow 0.2s ease, border-color 0.2s ease, transform 0.15s ease",
        }}
      >
        <div className="relative w-full overflow-hidden" style={{ height: 96 }}>
          <RecipeImage
            imageUrl={recipe.imageUrl}
            title={recipe.title}
            sizes="(max-width: 768px) 50vw, 33vw"
            width={300}
            height={96}
            priority={priority}
          />
          {recipe.category && (
            <div style={{ position: "absolute", top: 7, left: 7 }}>
              <div
                style={{
                  background: "rgba(0,0,0,0.45)",
                  borderRadius: 99,
                  padding: 0,
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  display: "inline-flex",
                }}
              >
                <Badge category={recipe.category} />
              </div>
            </div>
          )}
          {recipe.status === "tried" && (
            <div
              key="tried-badge"
              style={{
                position: "absolute",
                top: 7,
                right: 7,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "rgba(34,197,94,0.90)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1.5px solid rgba(134,239,172,0.60)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "tickIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 6l3 3 5-5"
                  stroke="#fff"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>
        <div className="flex flex-col flex-1 p-2 gap-1">
          <h2
            className="line-clamp-2 leading-snug"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--fg-1)",
            }}
          >
            {recipe.title}
          </h2>
          {recipe.servings && (
            <p className="text-[11px] mt-auto" style={{ color: "var(--fg-2)" }}>
              🍽️ {recipe.servings} {t("servings")}
            </p>
          )}
        </div>
      </button>

      {menuPos && (
        <RecipeCardContextMenu
          status={recipe.status ?? null}
          pos={menuPos}
          onClose={() => setMenuPos(null)}
          onToggleStatus={handleToggleStatus}
          onAddToCollection={() => {
            setMenuPos(null);
            setShowCollectionSheet(true);
          }}
          onDelete={handleDelete}
        />
      )}

      {showCollectionSheet && (
        <AddToCollectionSheet
          collections={collections}
          currentCollectionIds={recipe.collectionIds ?? []}
          onSelect={(id) => {
            handleAddToCollection(id);
          }}
          onClose={() => setShowCollectionSheet(false)}
        />
      )}
    </>
  );
}
