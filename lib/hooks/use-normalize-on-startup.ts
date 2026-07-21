"use client";

import { useEffect } from "react";
import { normalizePendingRecipes } from "@/lib/db/normalize-pending-recipes";

export function useNormalizeOnStartup() {
  useEffect(() => {
    normalizePendingRecipes().catch(() => {});
  }, []);
}
