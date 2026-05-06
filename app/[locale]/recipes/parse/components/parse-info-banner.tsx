import { Info } from "lucide-react";

export function ParseInfoBanner() {
  return (
    <div
      className="flex gap-[9px] items-start mb-4"
      style={{
        background: "var(--glass-subtle-bg)",
        backdropFilter: "var(--glass-subtle-blur)",
        WebkitBackdropFilter: "var(--glass-subtle-blur)",
        border: "1px solid var(--glass-subtle-border)",
        borderRadius: 14,
        padding: "10px 12px",
      }}
    >
      <Info
        size={13}
        strokeWidth={2}
        style={{ color: "rgba(147,197,253,0.8)", flexShrink: 0, marginTop: 1 }}
      />
      <div>
        <p style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.55 }}>
          Works with any recipe website — just paste the URL below.
        </p>
        <p style={{ fontSize: 12, color: "var(--fg-3)", lineHeight: 1.55, marginTop: 2 }}>
          Examples: silpo.ua, allrecipes.com, bbcgoodfood.com, cooking.nytimes.com
        </p>
      </div>
    </div>
  );
}
