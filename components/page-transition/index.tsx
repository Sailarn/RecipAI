"use client";

import { motion } from "motion/react";
import { useState } from "react";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isBack] = useState(() => {
    if (typeof window === "undefined") return false;
    const flag = sessionStorage.getItem("nav_back") === "1";
    if (flag) sessionStorage.removeItem("nav_back");
    return flag;
  });

  return (
    <motion.div
      initial={isBack ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={{ width: "100%", overflow: "hidden" }}
    >
      {children}
    </motion.div>
  );
}
