"use client";

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
  const without = current.filter((k) => k !== "all" && k !== key);
  const next = current.includes(key) ? without : [...without, key];
  return next.length === 0 ? ["all"] : next;
}

export function StatusChips({ active, onChange }: StatusChipsProps) {
  return (
    <div
      style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}
    >
      {OPTIONS.map(({ key, label }) => {
        const isActive = active.includes(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(toggleStatus(active, key))}
            style={{
              padding: "5px 12px",
              borderRadius: 99,
              border: "none",
              fontSize: 11,
              fontFamily: "var(--font-sans)",
              fontWeight: isActive ? 600 : 500,
              color: isActive ? "var(--fg-1)" : "var(--fg-3)",
              background: isActive ? "rgba(255,160,40,0.18)" : "transparent",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
