export function StatusBarScrim() {
  return (
    <div
      aria-hidden
      data-testid="status-bar-scrim"
      className="app-full-bleed-background status-bar-scrim pointer-events-none fixed z-[2147483647]"
    />
  );
}
