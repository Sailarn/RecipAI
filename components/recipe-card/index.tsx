"use client";

import { useParams } from "next/navigation";
import { memo, useCallback, useRef, useState } from "react";
import { AddToCollectionSheet } from "@/components/add-to-collection-sheet";
import { RecipeCardContextMenu } from "@/components/recipe-card-context-menu";
import { RecipeDetail } from "@/components/recipe-detail";
import { useLongPress } from "@/hooks/use-long-press";
import { deleteRecipe, updateRecipe } from "@/lib/db/recipes";
import type { Collection, Recipe } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";
import { cn } from "@/lib/utils";
import { CardFooter } from "./card-footer";
import { CardThumbnail } from "./card-thumbnail";
import { clampMenuPos } from "./constants";

interface RecipeCardProps {
  recipe: Recipe;
  collections: Collection[];
  priority?: boolean;
  pantryMatch?: { missing: number; total: number } | null;
}

export const RecipeCard = memo(function RecipeCard({
  recipe,
  collections,
  priority = false,
  pantryMatch,
}: RecipeCardProps) {
  const params = useParams();
  const locale = params.locale as string;
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [showCollectionSheet, setShowCollectionSheet] = useState(false);
  const didLongPress = useRef(false);

  const handleLongPress = useCallback((pos: { x: number; y: number }) => {
    didLongPress.current = true;
    setMenuPos(clampMenuPos(pos.x, pos.y));
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
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setHovered(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setHovered(false);
          longPressHandlers.onPointerLeave();
        }}
        onPointerDown={longPressHandlers.onPointerDown}
        onPointerUp={longPressHandlers.onPointerUp}
        onPointerCancel={longPressHandlers.onPointerCancel}
        onPointerMove={longPressHandlers.onPointerMove}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          // On fine-pointer devices (mouse/trackpad) right-click opens the app context menu.
          // On touch, the long-press timer handles it; here we just block the browser menu.
          if (
            typeof window !== "undefined" &&
            typeof window.matchMedia === "function" &&
            window.matchMedia("(pointer: fine)").matches
          ) {
            didLongPress.current = true;
            setMenuPos(clampMenuPos(event.clientX, event.clientY));
          }
        }}
        className={cn(
          "glass-card cursor-pointer h-full flex flex-col gap-0 overflow-hidden p-0 text-left rounded-[22px] select-none [-webkit-touch-callout:none] [transition:box-shadow_0.2s_ease,border-color_0.2s_ease,transform_0.15s_ease]",
          hovered &&
            "-translate-y-0.5 shadow-[0_8px_36px_rgba(0,0,0,0.60),inset_0_1px_0_rgba(255,220,130,0.18)] border-[rgba(255,210,130,0.28)]",
        )}
      >
        <CardThumbnail recipe={recipe} priority={priority} />
        <CardFooter
          title={recipe.title}
          servings={recipe.servings}
          pantryMatch={pantryMatch}
        />
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
});
