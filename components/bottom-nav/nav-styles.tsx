export function NavStyles() {
  return (
    <style>{`
      .glass-nav {
        background: rgba(255,255,255,0.15);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border: 1px solid rgba(255,255,255,0.25);
        box-shadow:
          0 8px 32px rgba(0,0,0,0.15),
          0 2px 8px rgba(0,0,0,0.08),
          inset 0 1px 0 rgba(255,255,255,0.4),
          inset 0 -1px 0 rgba(0,0,0,0.05);
      }
      .dark .glass-nav {
        background: rgba(20,20,20,0.45);
        border: 1px solid rgba(255,255,255,0.1);
        box-shadow:
          0 8px 32px rgba(0,0,0,0.4),
          0 2px 8px rgba(0,0,0,0.2),
          inset 0 1px 0 rgba(255,255,255,0.08),
          inset 0 -1px 0 rgba(0,0,0,0.2);
      }
      .nav-pill {
        transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
                    opacity 0.2s ease;
      }
    `}</style>
  );
}
