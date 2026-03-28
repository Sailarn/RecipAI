import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className = "",
  hover = false,
  onClick,
}: CardProps) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      className={`rounded-lg border p-4 transition-shadow h-full text-left ${hover ? "hover:shadow-lg" : ""} ${className}`}
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--card-border)",
        color: "var(--foreground)",
        width: "100%",
      }}
      onClick={onClick}
      type={onClick ? "button" : undefined}
    >
      {children}
    </Tag>
  );
}
