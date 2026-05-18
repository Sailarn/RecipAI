"use client";

import type { MotionValue } from "motion/react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  useVelocity,
} from "motion/react";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import { generateLensMap } from "./generate-lens-map";
import { type Measure, PILL_H, PILL_W } from "./nav-constants";
import { NavItem } from "./nav-item";

/**
 * Extra pixels of nav content rendered outside the pill clip window.
 * Gives the displacement filter room to sample at the edges so it doesn't
 * produce a dark fringe where it would otherwise read outside the element.
 */
const LENS_PAD = 10;

// Pixel dimensions of the padded inner filter host element.
// feImage must be given these explicit dimensions so it stretches to fill
// the element exactly — without them, feImage renders at its natural
// 64×32 size in the element centre, leaving edge pixels with a transparent
// displacement map that causes large spurious shifts.
const FILTER_W = PILL_W + LENS_PAD * 2; // 116
const FILTER_H = PILL_H + LENS_PAD * 2; //  65

interface NavLensProps {
  items: Array<{ href: string; label: string; icon?: ComponentType }>;
  leftMv: MotionValue<number>;
  measure: Measure | null;
  displayActiveIndex: number;
  yNormal: number;
}

/**
 * Renders a lens-distortion layer over the active pill position.
 *
 * Structure (inside the nav, position: absolute):
 *
 *   ┌── outer motion.div  (pill size + clip-path) ─────────────────────┐
 *   │  clip-path on the PARENT is applied AFTER the child's filter,    │
 *   │  so the filtered output is cleanly cropped to the pill shape.     │
 *   │                                                                    │
 *   │  ┌── inner div  (LENS_PAD larger on every side, has filter) ───┐  │
 *   │  │  The filter sees a padded region so edge pixels have source  │  │
 *   │  │  content to displace into — no black fringe at the rim.      │  │
 *   │  │                                                               │  │
 *   │  │  ┌── full-width nav replica (motion.div) ─────────────────┐ │  │
 *   │  │  │  Positioned so its coordinate space matches the real    │ │  │
 *   │  │  │  nav. As the pill moves right, this div shifts left by  │ │  │
 *   │  │  │  the same amount, keeping the correct icons centred.    │ │  │
 *   │  │  └────────────────────────────────────────────────────────┘ │  │
 *   │  └────────────────────────────────────────────────────────────┘  │
 *   └────────────────────────────────────────────────────────────────────┘
 */
export function NavLens({
  items,
  leftMv,
  measure,
  displayActiveIndex,
  yNormal,
}: NavLensProps) {
  const [lensMapUrl, setLensMapUrl] = useState("");

  // Generate the displacement map once on the client (canvas API, not SSR-safe).
  useEffect(() => {
    setLensMapUrl(generateLensMap(64, 32));
  }, []);

  // ── Velocity-driven scale ─────────────────────────────────────────────────
  // The distortion effect only appears while the pill is in motion.
  // scaleMv animates to ~20 when moving and back to 0 when the pill settles.
  const velocity = useVelocity(leftMv);
  const scaleMv = useMotionValue(0);
  const dispMapRef = useRef<SVGFEDisplacementMapElement>(null);

  // Opacity: fades in as soon as movement starts, fades out when scale → 0
  const opacity = useTransform(scaleMv, [0, 4, 20], [0, 1, 1], { clamp: true });

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const unsubVelocity = velocity.on("change", (v) => {
      clearTimeout(timeout);
      if (Math.abs(v) > 30) {
        // Moving: ramp up quickly
        animate(scaleMv, 20, { duration: 0.08, ease: "easeOut" });
      } else {
        // Settled: short pause then fade out so it doesn't flicker on slow spring frames
        timeout = setTimeout(() => {
          animate(scaleMv, 0, { duration: 0.25, ease: "easeIn" });
        }, 60);
      }
    });

    // Push scale value directly to SVG filter attribute — no React re-renders
    const unsubScale = scaleMv.on("change", (v) => {
      dispMapRef.current?.setAttribute("scale", v.toFixed(2));
    });

    return () => {
      unsubVelocity();
      unsubScale();
      clearTimeout(timeout);
    };
  }, [velocity, scaleMv]);

  // Keeps nav-replica left position aligned to nav coordinate space as pill moves.
  // inner.left = -(pillLeft - LENS_PAD)  so  navReplica origin = (0,0) in nav space.
  const innerLeft = useTransform(leftMv, (x) => -(x - LENS_PAD));

  if (!lensMapUrl || !measure) return null;

  const n = measure.itemLefts.length;
  const navW =
    measure.itemLefts[n - 1] + measure.itemWidths[n - 1] + measure.itemLefts[0]; // full nav width including both borders
  const navH = measure.innerHeight;

  return (
    <>
      {/* ── SVG filter definition ──────────────────────────────────────────── */}
      {/* Zero-size, off-screen; the filter is referenced by CSS url(#glass-lens) */}
      <svg
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        <defs>
          {/*
            glass-lens filter:
              feFlood       — neutral-grey base (#808080 = zero displacement)
              feImage       — lens displacement map, explicitly sized to FILTER_W×FILTER_H
                              so it stretches across the full inner element (not just 64×32)
              feComposite   — overlays lens map on the neutral base so areas outside
                              the image bounds fall back to zero-displacement grey
              feDisplacementMap — applies the combined map; scale driven by velocity
              10% margin gives the displaced source room to sample without clipping.
          */}
          <filter
            id="glass-lens"
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodColor="#808080" floodOpacity="1" result="neutral" />
            <feImage
              href={lensMapUrl}
              x={0}
              y={0}
              width={FILTER_W}
              height={FILTER_H}
              preserveAspectRatio="none"
              result="lens-raw"
            />
            <feComposite
              in="lens-raw"
              in2="neutral"
              operator="over"
              result="lens-map"
            />
            {/* scale starts at 0; updated imperatively via dispMapRef as pill moves */}
            <feDisplacementMap
              ref={dispMapRef}
              in="SourceGraphic"
              in2="lens-map"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* ── Outer: pill-shaped clip window ────────────────────────────────── */}
      <motion.div
        style={{
          position: "absolute",
          top: yNormal,
          left: leftMv, // MotionValue — tracks pill without re-renders
          width: PILL_W,
          height: PILL_H,
          // clip-path is on the PARENT of the filter element, so it clips the
          // already-filtered output (correct order: filter → clip)
          clipPath: "inset(0 round 18px)",
          overflow: "hidden", // belt-and-suspenders for border-radius clip
          borderRadius: 18,
          zIndex: 5, // above real items (z:4) and pill glass (z:1)
          pointerEvents: "none",
          opacity, // fades in/out with scaleMv; hides layer when stationary
        }}
      >
        {/* ── Inner: padded filter host ──────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            top: -LENS_PAD,
            left: -LENS_PAD,
            width: PILL_W + LENS_PAD * 2,
            height: PILL_H + LENS_PAD * 2,
            filter: "url(#glass-lens)",
          }}
        >
          {/* ── Nav replica: full-width, offset to show correct slice ──────── */}
          <motion.div
            style={{
              position: "absolute",
              top: -yNormal + LENS_PAD, // align to nav content origin
              left: innerLeft, // MotionValue: -(pillLeft - LENS_PAD)
              width: navW,
              height: navH,
              display: "flex",
            }}
          >
            {items.map((item, i) => (
              <div key={item.href} style={{ flex: 1, display: "flex" }}>
                <NavItem
                  label={item.label}
                  icon={item.icon}
                  isActive={i === displayActiveIndex}
                  onClick={() => {}}
                />
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}
