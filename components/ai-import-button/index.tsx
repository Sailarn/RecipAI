"use client";

import { useParams } from "next/navigation";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

export function AIImportButton() {
  const params = useParams();
  const locale = params.locale as string;
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate.push(routes.recipes.parse(locale))}
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
