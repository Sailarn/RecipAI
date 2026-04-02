"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

function getDepth(pathname: string): number {
  if (pathname.includes("/edit")) return 4;
  if (pathname.includes("/recipes/parse")) return 3;
  if (pathname.match(/\/recipes\/[^/]+$/)) return 2;
  if (pathname.includes("/recipes/new")) return 1;
  return 0;
}

let prevDepth = 0;

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentDepth = getDepth(pathname);
  const isForward = useRef(currentDepth >= prevDepth);

  useEffect(() => {
    prevDepth = currentDepth;
  }, [pathname, currentDepth]);

  return (
    <motion.div
      initial={{
        x: isForward.current ? 60 : -60,
        opacity: 0,
        filter: "blur(4px)",
      }}
      animate={{ x: 0, opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ width: "100%", overflow: "hidden" }}
    >
      {children}
    </motion.div>
  );
}
