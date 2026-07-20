"use client";

import { createContext, useContext, useMemo } from "react";
import { useTelegram } from "@/components/telegram-provider";
import { FEATURES, type Feature } from "./features";
import { createTelegramPlatform } from "./telegram";
import type { Platform } from "./types";
import { createWebPlatform } from "./web";

const PlatformContext = createContext<Platform>(createWebPlatform());

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const { webApp } = useTelegram();
  const platform = useMemo(
    () => (webApp ? createTelegramPlatform(webApp) : createWebPlatform()),
    [webApp],
  );
  return (
    <PlatformContext.Provider value={platform}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform(): Platform {
  return useContext(PlatformContext);
}

/** Convenience accessor for the haptics namespace. No-op on web. */
export function useHaptics(): Platform["haptics"] {
  return useContext(PlatformContext).haptics;
}

export function useFeature(feature: Feature): boolean {
  return FEATURES[usePlatform().kind][feature];
}

/** Declarative show/hide: renders children only when the feature is available. */
export function Capability({
  name,
  children,
}: {
  name: Feature;
  children: React.ReactNode;
}) {
  return useFeature(name) ? children : null;
}

export type { Feature } from "./features";
export type { Platform } from "./types";
