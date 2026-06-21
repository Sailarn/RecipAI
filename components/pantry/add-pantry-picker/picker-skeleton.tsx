import { Skeleton } from "@/components/ui/skeleton";

// A handful of placeholder tiles per faux category — enough to fill the panel
// while it slides, cheap enough not to reintroduce the rasterization stutter
// the real (full-vocabulary) grid caused. Mirrors the tile + header geometry in
// index.tsx so the swap to real content doesn't shift layout.
const SKELETON_GROUPS = [
  { id: "produce", labelWidth: "w-16", tiles: ["a", "b", "c", "d", "e", "f"] },
  { id: "dairy", labelWidth: "w-12", tiles: ["a", "b", "c", "d"] },
  { id: "pantry", labelWidth: "w-14", tiles: ["a", "b", "c", "d"] },
];

export function PickerSkeleton() {
  return (
    <div data-testid="pantry-picker-skeleton" aria-hidden="true">
      {SKELETON_GROUPS.map((group) => (
        <div key={group.id} className="mb-[18px]">
          <div className="flex items-center gap-[7px] px-0.5 pt-2 pb-[11px]">
            <Skeleton className="size-[7px] rounded-full shrink-0" />
            <Skeleton className={`h-3 ${group.labelWidth}`} />
          </div>
          <div className="grid grid-cols-2 gap-[9px]">
            {group.tiles.map((tileId) => (
              <div
                key={`${group.id}-${tileId}`}
                className="min-h-[50px] rounded-[14px] px-[13px] py-3 flex items-center gap-[9px] bg-[var(--glass-card-bg)] border-[1.5px] border-[var(--glass-card-border)]"
              >
                <Skeleton className="size-6 rounded-full shrink-0" />
                <Skeleton className="h-3.5 flex-1 max-w-[72%]" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
