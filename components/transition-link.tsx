"use client";
import { useNavigate } from "@/lib/transitions";

export function TransitionLink({
  href,
  children,
  className,
  style,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { push } = useNavigate();

  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        push(href);
      }}
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}
