// Ring geometry: a 34px box around the ~34px bell button, 2px stroke.
const SIZE = 34;
const STROKE = 2;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function BellProgressRing({
  progress,
  done = false,
}: {
  progress: number;
  done?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, progress));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);
  const center = SIZE / 2;

  return (
    <svg
      className="absolute inset-0 m-auto -rotate-90 pointer-events-none"
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden="true"
    >
      <circle
        cx={center}
        cy={center}
        r={RADIUS}
        fill="none"
        stroke={done ? "var(--green-500)" : "var(--download-accent)"}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset,stroke] duration-300 ease-out"
      />
    </svg>
  );
}
