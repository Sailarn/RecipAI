export function StatusBarScrim() {
  return (
    <div
      aria-hidden
      className="status-bar-scrim pointer-events-none fixed inset-x-0 top-0 z-[2147483647] h-[env(safe-area-inset-top)] bg-background"
    />
  );
}
