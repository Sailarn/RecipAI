import { motion } from "motion/react";
import type { ComponentType, ReactNode } from "react";

interface NavItemProps {
  label: string;
  icon?: ComponentType;
  renderIcon?: (isActive: boolean) => ReactNode;
  isActive: boolean;
  onClick: () => void;
  /** When true, the label text becomes invisible while the item is active. */
  hideLabelWhenActive?: boolean;
}

export function NavItem({
  label,
  icon: Icon,
  renderIcon,
  isActive,
  onClick,
  hideLabelWhenActive,
}: NavItemProps) {
  const labelHidden = isActive && hideLabelWhenActive;

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 flex-1"
      style={{
        color: isActive ? "var(--food-accent)" : "var(--fg-2)",
        transition: "color 0.2s ease",
        zIndex: 1,
        userSelect: "none",
        WebkitUserSelect: "none",
        background: "none",
        border: "none",
        cursor: "pointer",
      }}
    >
      {/* Icon wrapper — shifts down by half the label+gap height when label is hidden
          so the icon stays vertically centered in the button. */}
      <motion.span
        className="flex items-center justify-center"
        style={{ height: 28 }}
        animate={{ y: labelHidden ? 6 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 28, mass: 0.5 }}
      >
        {renderIcon ? renderIcon(isActive) : Icon ? <Icon /> : null}
      </motion.span>
      <span
        className="text-[10px] font-medium leading-none text-center"
        style={{ visibility: labelHidden ? "hidden" : "visible" }}
      >
        {label}
      </span>
    </button>
  );
}
