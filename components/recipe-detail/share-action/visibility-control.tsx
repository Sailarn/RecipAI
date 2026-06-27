"use client";

import { Globe2 } from "lucide-react";

interface VisibilityControlProps {
  isPublic: boolean;
  isSignedIn: boolean;
  isUpdating: boolean;
  onToggle: () => void;
}

export function VisibilityControl({
  isPublic,
  isSignedIn,
  isUpdating,
  onToggle,
}: VisibilityControlProps) {
  return (
    <>
      <div
        className={`flex items-center gap-3 rounded-[18px] border px-4 py-4 transition-colors ${
          isPublic
            ? "border-[color-mix(in_oklch,var(--green-400)_32%,transparent)] bg-[color-mix(in_oklch,var(--green-500)_15%,transparent)]"
            : "border-white/12 bg-white/[0.04]"
        }`}
      >
        <Globe2
          size={20}
          className={`shrink-0 ${isPublic ? "text-[var(--green-400)]" : "text-white/45"}`}
        />
        <span className="flex-1 text-[15px] font-semibold text-white">
          Public
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          aria-label="Public recipe"
          disabled={!isSignedIn || isUpdating}
          onClick={onToggle}
          className={`relative h-8 w-[54px] shrink-0 cursor-pointer rounded-full border-0 transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
            isPublic ? "bg-[var(--green-400)]" : "bg-white/15"
          }`}
        >
          <span
            className={`absolute top-[3px] h-[26px] w-[26px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-[left] ${
              isPublic ? "left-[25px]" : "left-[3px]"
            }`}
          />
        </button>
      </div>
      {!isSignedIn && (
        <p className="mt-2 text-[11px] text-amber-300">
          Sign in to share recipes.
        </p>
      )}
    </>
  );
}
