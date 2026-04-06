"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { useSwipeBack } from "@/hooks/use-swipe-back";

const BottomNav = dynamic(
  () =>
    import("@/components/bottom-nav").then((m) => ({ default: m.BottomNav })),
  { ssr: false },
);

const ParseJobWatcher = dynamic(
  () =>
    import("@/components/parse-job-watcher").then((m) => ({
      default: m.ParseJobWatcher,
    })),
  { ssr: false },
);

export function ClientShell({ children }: { children: React.ReactNode }) {
  useSwipeBack();

  useEffect(() => {
    const handlePopState = () => {
      sessionStorage.setItem("nav_back", "1");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 mx-auto max-w-7xl pb-24 w-full">{children}</main>
      <Toaster position="bottom-center" />
      <ParseJobWatcher />
      <BottomNav />
    </div>
  );
}
