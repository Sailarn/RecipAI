export function NavStyles() {
  return (
    <style>{`
      .glass-nav {
        background: rgba(255, 255, 255, 0.68);
        backdrop-filter: blur(32px) saturate(180%);
        -webkit-backdrop-filter: blur(32px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.5);
        box-shadow:
          0 4px 20px rgba(0, 0, 0, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.75);
      }
      .dark .glass-nav {
        background: rgba(28, 28, 30, 0.75);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow:
          0 4px 20px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }

      /* Glass pill — normal state */
      .nav-pill {
        backdrop-filter: blur(14px) saturate(160%);
        -webkit-backdrop-filter: blur(14px) saturate(160%);
        background: rgba(37, 99, 235, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.22);
        box-shadow:
          inset 0 1px 1px rgba(255, 255, 255, 0.4),
          inset 0 -1px 1px rgba(0, 0, 0, 0.06),
          0 2px 6px rgba(0, 0, 0, 0.08);
        transition:
          backdrop-filter 0.3s ease,
          -webkit-backdrop-filter 0.3s ease,
          background 0.2s ease,
          box-shadow 0.2s ease,
          border-color 0.2s ease;
      }
      .dark .nav-pill {
        background: rgba(255, 255, 255, 0.09);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow:
          inset 0 1px 1px rgba(255, 255, 255, 0.1),
          inset 0 -1px 1px rgba(0, 0, 0, 0.2),
          0 2px 8px rgba(0, 0, 0, 0.25);
      }

      /* Glass pill — dragging state: lens / refraction effect */
      .nav-pill-dragging {
        /* hue-rotate creates chromatic aberration — prismatic light through glass */
        backdrop-filter: blur(22px) saturate(220%) brightness(1.1) hue-rotate(8deg);
        -webkit-backdrop-filter: blur(22px) saturate(220%) brightness(1.1) hue-rotate(8deg);
        background: rgba(37, 99, 235, 0.16);
        border: 1px solid rgba(255, 255, 255, 0.35);
        box-shadow:
          inset 0 1.5px 2px rgba(255, 255, 255, 0.55),
          inset 0 -1.5px 2px rgba(0, 0, 0, 0.1),
          0 6px 20px rgba(0, 0, 0, 0.14),
          0 1px 0 rgba(255, 255, 255, 0.2);
      }
      .dark .nav-pill-dragging {
        background: rgba(255, 255, 255, 0.13);
        border: 1px solid rgba(255, 255, 255, 0.22);
        box-shadow:
          inset 0 1.5px 2px rgba(255, 255, 255, 0.18),
          inset 0 -1.5px 2px rgba(0, 0, 0, 0.3),
          0 6px 20px rgba(0, 0, 0, 0.4),
          0 1px 0 rgba(255, 255, 255, 0.08);
      }
    `}</style>
  );
}
