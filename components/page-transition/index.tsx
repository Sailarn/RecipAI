"use client";

import { motion } from "motion/react";
import { useState } from "react";

// Flips true after the first mount. The initial mount is the hydration pass and
// must match the server (which always assumes a forward navigation), so we
// ignore sessionStorage there — reading it could yield `true` on the client
// only, changing the motion `initial` and causing a hydration mismatch. Later
// mounts are client-side navigations, where reading the flag is safe.
let hasHydrated = false;

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isBack] = useState(() => {
    if (typeof window === "undefined") return false;
    if (!hasHydrated) {
      hasHydrated = true;
      return false;
    }
    const flag = sessionStorage.getItem("nav_back") === "1";
    if (flag) sessionStorage.removeItem("nav_back");
    return flag;
  });

  return (
    <motion.div
      initial={isBack ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      // Forward-nav fade. The RSC round-trip completes before this template
      // mounts, so the fade is pure tail cost on already-arrived content — keep
      // it short so router-pushed tab switches feel snappy, not translucent.
      transition={{ duration: 0.08, ease: "easeOut" }}
      style={{ width: "100%", height: "100%" }}
    >
      {children}
    </motion.div>
  );
}
