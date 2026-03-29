import { Skeleton } from "@/components/ui/skeleton";

const skeletonIds = ["a", "b", "c", "d", "e", "f"];

export function RecipeListSkeleton() {
  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-10 w-full mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skeletonIds.map((id) => (
            <div
              key={id}
              className="flex flex-col gap-3 p-4 rounded-lg shadow-md"
              style={{ backgroundColor: "var(--card)" }}
            >
              <Skeleton className="w-full h-48 rounded-md" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
