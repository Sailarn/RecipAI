"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { getParseHistory } from "@/lib/db/parse-history";
import { useNavigate } from "@/lib/transitions";
import { ParseHistoryRow } from "./entry-row";

export function ParseHistoryView() {
  const navigate = useNavigate();
  const entries = useLiveQuery(() => getParseHistory(), []);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-base)] overflow-hidden">
      <header className="shrink-0 pt-[max(20px,calc(env(safe-area-inset-top)+8px))] px-4 pb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate.back()}
          aria-label="Back"
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-[var(--glass-card-bg)] border border-[var(--glass-card-border)] text-[var(--fg-1)] cursor-pointer"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="font-heading text-[22px] font-extrabold text-[var(--fg-1)]">
          Import history
        </h1>
      </header>

      {entries !== undefined && entries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <p className="font-medium text-[var(--fg-2)]">No imports yet</p>
          <p className="mt-1 text-sm text-[var(--fg-3)]">
            Recipes you import — and any that fail — will show up here.
          </p>
        </div>
      ) : (
        <ul className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-[100px] space-y-3">
          {entries?.map((entry) => (
            <ParseHistoryRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}
