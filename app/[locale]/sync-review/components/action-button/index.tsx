type ActionButtonVariant = "default" | "danger" | "ghost";

const VARIANT_CLASSES: Record<ActionButtonVariant, string> = {
  default: "bg-[rgba(59,130,246,0.85)] text-white border-transparent",
  danger:
    "bg-[rgba(239,68,68,0.12)] text-[#ef4444] border border-[rgba(239,68,68,0.25)]",
  ghost:
    "bg-[rgba(255,255,255,0.05)] text-[var(--fg-2)] border border-[rgba(255,200,100,0.12)]",
};

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  variant?: ActionButtonVariant;
}

export function ActionButton({
  label,
  onClick,
  variant = "default",
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-[6px] px-3 rounded-[10px] text-[12px] font-semibold font-sans cursor-pointer ${VARIANT_CLASSES[variant]}`}
    >
      {label}
    </button>
  );
}
