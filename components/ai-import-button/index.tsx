"use client";

import { useParams } from "next/navigation";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

interface AIImportButtonProps {
  // When provided, called instead of navigating directly to the parse page.
  // Used by RecipeNewView to push the parse view onto the navigation stack.
  onNavigate?: () => void;
}

export function AIImportButton({ onNavigate }: AIImportButtonProps) {
  const params = useParams();
  const locale = params.locale as string;
  const navigate = useNavigate();

  const handleClick = () => {
    if (onNavigate) {
      onNavigate();
    } else {
      navigate.push(routes.recipes.parse(locale));
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="ai-import-btn relative w-full overflow-hidden rounded-xl px-6 py-4 text-sm font-medium transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
    >
      {/* shimmer sweep */}
      <div className="ai-import-shimmer" />

      {/* content */}
      <div className="relative z-10 flex flex-col items-center gap-1">
        <span className="text-base font-semibold">✨ AI Import</span>
        <span className="text-xs opacity-75">
          Paste a URL and let AI do the work
        </span>
      </div>
    </button>
  );
}
