export function RecipeListError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-10 text-center gap-4">
      <p className="text-[13px] text-destructive leading-[1.8]">
        Something went wrong loading your recipes.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="text-[13px] font-semibold text-destructive border border-destructive rounded-lg py-1.5 px-4 cursor-pointer bg-transparent hover:bg-destructive/10 transition-colors"
      >
        Reload
      </button>
    </div>
  );
}
