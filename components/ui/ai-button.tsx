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
      data-active={enabled}
      className={`relative overflow-hidden w-full rounded-[20px] py-[14px] px-4 border bg-[linear-gradient(135deg,rgba(24,20,60,0.97),rgba(42,12,90,0.93),rgba(24,20,60,0.97))] [background-size:200%_200%] [transition:opacity_0.2s_ease,border-color_0.2s_ease] ${
        enabled
          ? "cursor-pointer border-[rgba(139,92,246,0.45)] animate-[aiGrad_4s_ease_infinite] shadow-[0_0_28px_rgba(139,92,246,0.3),0_4px_16px_rgba(0,0,0,0.5)] opacity-100"
          : "cursor-not-allowed border-[rgba(139,92,246,0.20)] opacity-50"
      }`}
    >
      {/* Shimmer overlay */}
      {enabled && (
        <span
          aria-hidden
          className="absolute top-0 left-[-100%] w-[55%] h-full bg-[linear-gradient(90deg,transparent,rgba(167,139,250,0.2),transparent)] animate-[aiShimmer_3s_ease-in-out_infinite] pointer-events-none z-[1]"
        />
      )}

      <span className="relative z-[2] flex items-center justify-center gap-[9px]">
        {loading ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-[rgba(221,214,254,0.3)] border-t-[#ede9fe] animate-[spin_0.7s_linear_infinite] shrink-0" />
            <span className="text-[#ede9fe] text-[14px] font-semibold [font-family:var(--font-sans)]">
              {loadingLabel}
            </span>
          </>
        ) : (
          <>
            <span className="text-[16px]">✨</span>
            <span className="text-[#ede9fe] text-[14px] font-bold [font-family:var(--font-sans)]">
              {label}
            </span>
          </>
        )}
      </span>
    </button>
  );
}
