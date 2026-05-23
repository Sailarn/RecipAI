"use client";

export type StatusFilter = "all" | "tried";

interface StatusChipsProps {
  active: StatusFilter;
  onChange: (value: StatusFilter) => void;
}

const OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "tried", label: "Tried ✓" },
];

export function StatusChips({ active, onChange }: StatusChipsProps) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
      {OPTIONS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          style={{
            padding: "5px 12px",
            borderRadius: 99,
            border: "none",
            fontSize: 11,
            fontFamily: "var(--font-sans)",
            fontWeight: active === key ? 600 : 500,
            color: active === key ? "var(--fg-1)" : "var(--fg-3)",
            background:
              active === key ? "rgba(255,160,40,0.18)" : "transparent",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
