import { useEffect, useState } from "react";
import type { StatusFilter } from "@/components/status-chips";
import { useLiveQueryTransition } from "@/hooks/use-live-query-transition";
import { type SortOption, useRecipeFilter } from "@/hooks/use-recipe-filter";
import { useRecipeMatcher } from "@/hooks/use-recipe-matcher";
import {
  createCollection,
  deleteCollection,
  getAllCollections,
  renameCollection,
} from "@/lib/db/collections";
import { getAllRecipes } from "@/lib/db/recipes";
import type { Collection, Recipe } from "@/lib/db/schema";
import { recipesPageCache } from "@/lib/recipes-prefetch";
import { trackEvent } from "@/lib/telemetry";

export interface FilterState {
  search: string;
  setSearch: (value: string) => void;
  sort: SortOption;
  setSort: (value: SortOption) => void;
  category: string | null;
  setCategory: (value: string | null) => void;
  status: StatusFilter;
  setStatus: (value: StatusFilter) => void;
  collectionId: string | null;
  setCollectionId: (value: string | null) => void;
  filtered: Recipe[];
}

export interface NewCollectionModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  onCreate: (data: Pick<Collection, "name" | "emoji">) => Promise<void>;
}

export interface EditCollectionModalState {
  collection: Collection | null;
  open: (collection: Collection) => void;
  close: () => void;
  onSave: (data: Pick<Collection, "name" | "emoji">) => Promise<void>;
  onDelete: () => Promise<void>;
}

export interface RecipesPageState {
  recipes: Recipe[] | undefined;
  loading: boolean;
  recipesError: boolean;
  collections: Collection[];
  getMissing: (recipe: Recipe) => { missing: number; total: number } | null;
  filter: FilterState;
  newCollectionModal: NewCollectionModalState;
  editCollectionModal: EditCollectionModalState;
}

export function useRecipesPageState(): RecipesPageState {
  const [recipesError, setRecipesError] = useState(false);
  const recipesFromDB = useLiveQueryTransition(
    () => getAllRecipes(),
    [],
    () => setRecipesError(true),
  );
  // Written during render (not useEffect) intentionally — keeps the cache synchronous
  // with the render cycle so the next page visit gets instant data on frame 1.
  // Idempotent (same value re-written), so Strict Mode double-invoke is harmless.
  if (recipesFromDB !== undefined) recipesPageCache.recipes = recipesFromDB;
  const recipes = recipesFromDB ?? recipesPageCache.recipes;
  // False when errored — the page shows RecipeListError before checking loading,
  // so the skeleton never appears when there is an active error and recipes is undefined.
  const loading = !recipesError && recipes === undefined;

  const collectionsFromDB = useLiveQueryTransition(
    () => getAllCollections(),
    [],
  );
  // Same synchronous cache pattern as recipes above.
  if (collectionsFromDB !== undefined)
    recipesPageCache.collections = collectionsFromDB;
  const collections = collectionsFromDB ?? recipesPageCache.collections ?? [];

  const { getMissing } = useRecipeMatcher();

  const {
    search,
    setSearch,
    sort,
    setSort,
    category,
    setCategory,
    status,
    setStatus,
    collectionId,
    setCollectionId,
    filtered,
  } = useRecipeFilter(recipes ?? [], getMissing);

  const [showNewCollection, setShowNewCollection] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(
    null,
  );

  useEffect(() => {
    if (!search.trim()) return;
    const timer = setTimeout(() => {
      trackEvent("search_performed", {
        query: search,
        results_count: filtered.length,
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [search, filtered.length]);

  const newCollectionModal: NewCollectionModalState = {
    isOpen: showNewCollection,
    open: () => setShowNewCollection(true),
    close: () => setShowNewCollection(false),
    onCreate: async (data) => {
      await createCollection(data);
      trackEvent("collection_created", undefined);
      setShowNewCollection(false);
    },
  };

  const editCollectionModal: EditCollectionModalState = {
    collection: editingCollection,
    open: (collection) => setEditingCollection(collection),
    close: () => setEditingCollection(null),
    onSave: async (data) => {
      if (!editingCollection) return;
      await renameCollection(editingCollection.id, data.name, data.emoji);
    },
    onDelete: async () => {
      if (!editingCollection) return;
      await deleteCollection(editingCollection.id);
      if (collectionId === editingCollection.id) setCollectionId(null);
      setEditingCollection(null);
    },
  };

  return {
    recipes,
    loading,
    recipesError,
    collections,
    getMissing,
    filter: {
      search,
      setSearch,
      sort,
      setSort,
      category,
      setCategory,
      status,
      setStatus,
      collectionId,
      setCollectionId,
      filtered,
    },
    newCollectionModal,
    editCollectionModal,
  };
}
