"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

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

  useEffect(() => {
    prevDepth = currentDepth;
  }, [pathname, currentDepth]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{ width: "100%", overflow: "hidden" }}
    >
      {children}
    </motion.div>
  );
}
