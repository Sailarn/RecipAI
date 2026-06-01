import type { Collection } from "@/lib/db/schema";

interface CollectionRowProps {
  collection: Collection;
  inCollection: boolean;
  onSelect: (collectionId: string) => void;
}

export function CollectionRow({
  collection,
  inCollection,
  onSelect,
}: CollectionRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(collection.id)}
      className="flex items-center justify-between w-full min-h-12 px-3.5 bg-transparent border-b border-[rgba(255,200,100,0.08)] cursor-pointer text-[var(--fg-1)] text-sm font-sans"
    >
      <span>
        {collection.emoji} {collection.name}
      </span>
      <span className="w-5 h-5 flex items-center justify-center shrink-0">
        {inCollection && (
          <svg
            data-testid={`check-${collection.id}`}
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="9" cy="9" r="9" fill="rgba(34,197,94,0.85)" />
            <path
              d="M5 9l3 3 5-5"
              stroke="#fff"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
