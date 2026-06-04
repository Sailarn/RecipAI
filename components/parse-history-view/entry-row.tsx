"use client";

import { AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { PARSE_HISTORY_STATUS, type ParseHistoryEntry } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export function ParseHistoryRow({ entry }: { entry: ParseHistoryEntry }) {
  const isDone = entry.status === PARSE_HISTORY_STATUS.DONE;

  return (
    <li className="glass-card rounded-2xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-medium text-sm text-[var(--fg-1)] break-words">
          {entry.title}
        </p>
        <span
          className={cn(
            "shrink-0 flex items-center gap-1 rounded-full py-0.5 px-2 text-[11px] font-semibold",
            isDone
              ? "text-[var(--green-500)] bg-[color-mix(in_oklch,var(--green-500)_16%,transparent)]"
              : "text-[var(--action-destructive)] bg-[color-mix(in_oklch,var(--action-destructive)_16%,transparent)]",
          )}
        >
          {isDone ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
          {isDone ? "Done" : "Failed"}
        </span>
      </div>

      {entry.reason && (
        <p className="text-xs text-[var(--fg-2)] leading-relaxed break-words line-clamp-4">
          {entry.reason}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 min-w-0 text-xs text-[var(--fg-3)] hover:text-[var(--fg-2)] transition-colors"
        >
          <ExternalLink size={12} className="shrink-0" />
          <span className="truncate">{entry.url}</span>
        </a>
        <span className="shrink-0 text-[11px] text-[var(--fg-3)]">
          {entry.createdAt.toLocaleDateString()}
        </span>
      </div>
    </li>
  );
}
