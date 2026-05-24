import { motion } from "motion/react";
import type { ComponentType, ReactNode } from "react";

interface NavItemProps {
  label: string;
  icon?: ComponentType;
  renderIcon?: (isActive: boolean) => ReactNode;
  isActive: boolean;
  onClick: () => void;
  /** When true, the label collapses (display:none) while the item is active.
   *  Uses no Motion animation so the change is synchronous with the React render. */
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
      {hideLabelWhenActive ? (
        // Plain span — no Motion so the icon repositions synchronously
        // when the label collapses (display:none removes its space instantly).
        <span
          className="flex items-center justify-center"
          style={{ height: 28 }}
        >
          {renderIcon ? renderIcon(isActive) : Icon ? <Icon /> : null}
        </span>
      ) : (
        // Spring animation for regular nav items that never hide their label.
        <motion.span
          className="flex items-center justify-center"
          style={{ height: 28 }}
          animate={{ y: 0 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 28,
            mass: 0.5,
          }}
        >
          {renderIcon ? renderIcon(isActive) : Icon ? <Icon /> : null}
        </motion.span>
      )}
      <span
        className="text-[10px] font-medium leading-none text-center"
        style={{ display: labelHidden ? "none" : undefined }}
      >
        {label}
      </span>
    </button>
  );
}
