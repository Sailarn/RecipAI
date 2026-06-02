import type { ReactNode } from "react";

interface NavColumnProps {
  icon: ReactNode;
  label: string;
}

/**
 * The icon-over-label column shared by the pantry pill's three states
 * (back orb, pantry orb, expanded pantry label). Colour is inherited from the
 * parent so each caller controls the active/inactive tint.
 */
export function NavColumn({ icon, label }: NavColumnProps) {
  return (
    <>
      <span className="h-7 flex items-center justify-center">{icon}</span>
      <span className="text-[10px] font-semibold leading-none font-sans">
        {label}
      </span>
    </>
  );
}
