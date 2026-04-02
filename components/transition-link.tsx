import Link from "next/link";
import { nav } from "@/lib/transitions";

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
  return (
    <Link
      href={href}
      className={className}
      style={style}
      onClick={() => {
        nav.direction = "forward";
      }}
    >
      {children}
    </Link>
  );
}
