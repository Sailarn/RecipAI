"use client";

interface AiButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  loadingLabel?: string;
}

export function AiButton({
  onClick,
  disabled = false,
  loading = false,
  label = "Import with AI",
  loadingLabel = "Processing…",
}: AiButtonProps) {
  const enabled = !disabled && !loading;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        borderRadius: 20,
        padding: "14px 16px",
        cursor: enabled ? "pointer" : "not-allowed",
        border: `1px solid ${enabled ? "rgba(139,92,246,0.45)" : "rgba(139,92,246,0.20)"}`,
        background:
          "linear-gradient(135deg, rgba(24,20,60,0.97), rgba(42,12,90,0.93), rgba(24,20,60,0.97))",
        backgroundSize: "200% 200%",
        animation: enabled ? "aiGrad 4s ease infinite" : "none",
        boxShadow: enabled
          ? "0 0 28px rgba(139,92,246,0.3), 0 4px 16px rgba(0,0,0,0.5)"
          : "none",
        opacity: enabled ? 1 : 0.5,
        transition: "opacity 0.2s ease, border-color 0.2s ease",
      }}
    >
      {/* Shimmer overlay */}
      {enabled && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: "-100%",
            width: "55%",
            height: "100%",
            background:
              "linear-gradient(90deg, transparent, rgba(167,139,250,0.2), transparent)",
            animation: "aiShimmer 3s ease-in-out infinite",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      )}

      <span
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 9,
        }}
      >
        {loading ? (
          <>
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                border: "2px solid rgba(221,214,254,0.3)",
                borderTopColor: "#ede9fe",
                animation: "spin 0.7s linear infinite",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: "#ede9fe",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
              }}
            >
              {loadingLabel}
            </span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 16 }}>✨</span>
            <span
              style={{
                color: "#ede9fe",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "var(--font-sans)",
              }}
            >
              {label}
            </span>
          </>
        )}
      </span>
    </button>
  );
}
