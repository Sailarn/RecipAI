"use client";

import { CompactFilterBar } from "@/components/compact-filter-bar";
import { EditCollectionModal } from "@/components/edit-collection-modal";
import { NewCollectionModal } from "@/components/new-collection-modal";
import type {
  EditCollectionModalState,
  FilterState,
  NewCollectionModalState,
} from "@/hooks/use-recipes-page-state";
import type { Collection } from "@/lib/db/schema";

interface RecipesPageOverlaysProps {
  isCollapsed: boolean;
  filter: FilterState;
  collections: Collection[];
  newCollectionModal: NewCollectionModalState;
  editCollectionModal: EditCollectionModalState;
  onScrollTop: () => void;
}

export function RecipesPageOverlays({
  isCollapsed,
  filter,
  collections,
  newCollectionModal,
  editCollectionModal,
  onScrollTop,
}: RecipesPageOverlaysProps) {
  return (
    <>
      {isCollapsed && (
        <CompactFilterBar
          activeCollectionId={filter.collectionId}
          collections={collections}
          search={filter.search}
          sort={filter.sort}
          category={filter.category}
          status={filter.status}
          onScrollTop={onScrollTop}
        />
      )}

      {newCollectionModal.isOpen && (
        <NewCollectionModal
          onClose={newCollectionModal.close}
          onCreate={newCollectionModal.onCreate}
        />
      )}

      {editCollectionModal.collection && (
        <EditCollectionModal
          collection={editCollectionModal.collection}
          onClose={editCollectionModal.close}
          onSave={editCollectionModal.onSave}
          onDelete={editCollectionModal.onDelete}
        />
      )}
    </>
  );
}
