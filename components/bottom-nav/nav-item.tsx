import type { ComponentType } from "react";
import { TransitionLink } from "../transition-link";

interface NavItemProps {
  href: string;
  label: string;
  icon: ComponentType;
  isActive: boolean;
}

export function NavItem({ href, label, icon: Icon, isActive }: NavItemProps) {
  return (
    <TransitionLink
      href={href}
      className="relative flex flex-col items-center gap-0.5 py-1.5 rounded-xl flex-1 active:scale-90"
      style={{
        color: isActive ? "var(--primary)" : "var(--muted-foreground)",
        transition: "color 0.2s ease, transform 0.1s ease",
      }}
    >
      <span
        style={{
          filter: isActive ? "drop-shadow(0 0 5px var(--primary))" : "none",
          transition: "filter 0.3s ease",
        }}
      >
        <Icon />
      </span>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </TransitionLink>
  );
}
