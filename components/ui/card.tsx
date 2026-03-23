import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = "", hover = false }: CardProps) {
  return (
    <div
      className={`rounded-lg border p-4 transition-shadow ${
        hover ? "hover:shadow-lg" : ""
      } ${className}`}
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--card-border)",
        color: "var(--foreground)",
      }}
    >
      {children}
    </div>
  );
}
