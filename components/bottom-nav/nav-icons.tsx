import "@/app/styles/nav-icons.css";
import { CircleUserRound, ShoppingBasket, UtensilsCrossed } from "lucide-react";

export const RecipesIcon = () => (
  <UtensilsCrossed aria-hidden="true" width={20} height={20} strokeWidth={2} />
);

export const ProfileIcon = () => (
  <CircleUserRound aria-hidden="true" width={20} height={20} strokeWidth={2} />
);

export const PantryIcon = () => (
  <ShoppingBasket aria-hidden="true" width={20} height={20} strokeWidth={2} />
);

const PARTICLES = [
  { angle: 0, r: 14, size: 2.5, delay: 0, dur: 3.2 },
  { angle: 60, r: 16, size: 2, delay: 0.5, dur: 3.8 },
  { angle: 120, r: 13, size: 3, delay: 1.0, dur: 3.0 },
  { angle: 180, r: 15, size: 2, delay: 1.5, dur: 4.0 },
  { angle: 240, r: 14, size: 1.5, delay: 0.8, dur: 3.5 },
  { angle: 300, r: 16, size: 2.5, delay: 0.3, dur: 2.8 },
];

export function AINavIcon({ isActive }: { isActive: boolean }) {
  return (
    <div
      style={{
        position: "relative",
        width: 28,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Aurora rotating ring — only when active */}
      {isActive && (
        <div
          style={{
            position: "absolute",
            inset: -6,
            borderRadius: "50%",
            zIndex: 0,
            background:
              "conic-gradient(from 0deg, rgba(139,92,246,0), rgba(167,139,250,0.55), rgba(251,191,36,0.4), rgba(139,92,246,0.5), rgba(167,139,250,0), rgba(139,92,246,0))",
            animation: "auroraRing 3s linear infinite",
            maskImage:
              "radial-gradient(circle, transparent 55%, black 70%, black 100%)",
            WebkitMaskImage:
              "radial-gradient(circle, transparent 55%, black 70%, black 100%)",
          }}
        />
      )}

      {/* Soft violet glow — only when active */}
      {isActive && (
        <div
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            zIndex: 0,
            background:
              "radial-gradient(circle, rgba(139,92,246,0.30) 0%, rgba(139,92,246,0.08) 60%, transparent 80%)",
            animation: "aiPulse 2.5s ease-in-out infinite",
          }}
        />
      )}

      {/* Orbiting particles — only when active */}
      {isActive &&
        PARTICLES.map((p, i) => (
          <div
            key={p.angle}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background:
                i % 2 === 0 ? "rgba(167,139,250,0.9)" : "rgba(251,191,36,0.85)",
              boxShadow:
                i % 2 === 0
                  ? "0 0 3px rgba(167,139,250,0.8)"
                  : "0 0 3px rgba(251,191,36,0.8)",
              marginTop: -p.size / 2,
              marginLeft: -p.size / 2,
              ["--a" as string]: `${p.angle}deg`,
              ["--r" as string]: `${p.r}px`,
              animation: `aiOrbit ${p.dur}s linear infinite`,
              animationDelay: `${p.delay}s`,
              zIndex: 3,
            }}
          />
        ))}

      {/* ✨ icon */}
      <span
        style={{
          fontSize: 17,
          position: "relative",
          zIndex: 2,
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: isActive ? "aiPulse 2.5s ease-in-out infinite" : "none",
          filter: isActive
            ? "drop-shadow(0 0 4px rgba(167,139,250,0.8))"
            : "none",
          transition: "filter 0.3s ease",
        }}
      >
        ✨
      </span>
    </div>
  );
}
