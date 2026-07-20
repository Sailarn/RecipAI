"use client";

import { motion } from "motion/react";
import type { ComponentType, ReactNode } from "react";
import { useHaptics } from "@/lib/platform";

interface NavItemProps {
  label: string;
  icon?: ComponentType;
  renderIcon?: (isActive: boolean) => ReactNode;
  isActive: boolean;
  onClick: () => void;
  /** When true the label animates out when the item is active and the icon
   *  springs down to fill the vertical centre left by the departing text. */
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
  const haptics = useHaptics();

  const handleClick = () => {
    if (!isActive) haptics.selection();
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
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
        // AI Import: label fades and icon slides simultaneously (no DOM removal,
        // so no two-phase stutter). Label stays in the DOM at opacity 0 so the
        // flex layout is unchanged — the y offset reaches true vertical centre.
        <>
          <motion.span
            className="flex items-center justify-center"
            style={{ height: 28 }}
            animate={{ y: labelHidden ? 6 : 0 }}
            transition={{ type: "tween", ease: "easeInOut", duration: 0.22 }}
          >
            {renderIcon ? renderIcon(isActive) : Icon ? <Icon /> : null}
          </motion.span>
          <motion.span
            className="text-[10px] font-medium leading-none text-center"
            animate={{ opacity: labelHidden ? 0 : 1 }}
            transition={{ type: "tween", ease: "easeInOut", duration: 0.22 }}
          >
            {label}
          </motion.span>
        </>
      ) : (
        // Regular items: no animation — plain spans avoid any Motion frame delay.
        <>
          <span
            className="flex items-center justify-center"
            style={{ height: 28 }}
          >
            {renderIcon ? renderIcon(isActive) : Icon ? <Icon /> : null}
          </span>
          <span className="text-[10px] font-medium leading-none text-center">
            {label}
          </span>
        </>
      )}
    </button>
  );
}
