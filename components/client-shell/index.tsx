"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { PageStack } from "@/components/page-stack";
import { NavigationStackProvider } from "@/lib/navigation-stack";

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
  const pathname = usePathname();

  return (
    <NavigationStackProvider initialHref={pathname} currentPage={children}>
      <PageStack />
      <Toaster position="bottom-center" />
      <ParseJobWatcher />
      <BottomNav />
    </NavigationStackProvider>
  );
}
