"use client";

import { cn } from "@/lib/utils";

export type StatusFilterKey = "all" | "tried" | "cancook" | "nearly";
export type StatusFilter = StatusFilterKey[];

interface StatusChipsProps {
  active: StatusFilter;
  onChange: (value: StatusFilter) => void;
}

const OPTIONS: { key: StatusFilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "tried", label: "Tried ✓" },
  { key: "cancook", label: "Can Cook 🟢" },
  { key: "nearly", label: "Half+ 🟡" },
];

export function toggleStatus(
  current: StatusFilter,
  key: StatusFilterKey,
): StatusFilter {
  if (key === "all") return ["all"];
  const without = current.filter(
    (existingKey) => existingKey !== "all" && existingKey !== key,
  );
  const next = current.includes(key) ? without : [...without, key];
  return next.length === 0 ? ["all"] : next;
}

export function StatusChips({ active, onChange }: StatusChipsProps) {
  return (
    <div className="flex gap-[6px] mb-[14px] flex-wrap">
      {OPTIONS.map(({ key, label }) => {
        const isActive = active.includes(key);
        return (
          <button
            key={key}
            type="button"
            data-active={isActive}
            onClick={() => onChange(toggleStatus(active, key))}
            className={cn(
              "py-[5px] px-3 rounded-full border-0 text-[11px] font-[family-name:var(--font-sans)] cursor-pointer transition-all duration-150 ease",
              isActive
                ? "font-semibold text-[var(--fg-1)] bg-[rgba(255,160,40,0.18)]"
                : "font-medium text-[var(--fg-3)] bg-transparent",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
