interface NavPillProps {
  activeIndex: number;
  itemCount: number;
}

export function NavPill({ activeIndex, itemCount }: NavPillProps) {
  if (activeIndex === -1) return null;

  return (
    <div
      className="nav-pill absolute top-0 bottom-0 rounded-xl pointer-events-none"
      style={{
        width: `${100 / itemCount}%`,
        transform: `translateX(${activeIndex * 100}%)`,
        background: "rgba(37,99,235,0.15)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    />
  );
}
