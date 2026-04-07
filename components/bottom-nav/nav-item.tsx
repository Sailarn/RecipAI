import type { ComponentType } from "react";

interface NavItemProps {
  label: string;
  icon: ComponentType;
  isActive: boolean;
  onClick: () => void;
}

export function NavItem({
  label,
  icon: Icon,
  isActive,
  onClick,
}: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col items-center gap-0.5 py-1.5 flex-1"
      style={{
        color: isActive ? "var(--primary)" : "var(--muted-foreground)",
        transition: "color 0.2s ease",
        zIndex: 1,
        userSelect: "none",
        WebkitUserSelect: "none",
        background: "none",
        border: "none",
        cursor: "pointer",
      }}
    >
      <span>
        <Icon />
      </span>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}
