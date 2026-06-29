"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { MaintenanceListener } from "@/components/maintenance-listener";
import { PageStack } from "@/components/page-stack";
import { useNormalizeOnStartup } from "@/lib/hooks/use-normalize-on-startup";
import { useTelemetryIdentity } from "@/lib/hooks/use-telemetry-identity";
import { useVocabSync } from "@/lib/hooks/use-vocab-sync";
import { NavigationStackProvider } from "@/lib/navigation-stack";

const BottomNav = dynamic(
  () =>
    import("@/components/bottom-nav").then((module) => ({
      default: module.BottomNav,
    })),
  { ssr: false },
);

const ParseJobWatcher = dynamic(
  () =>
    import("@/components/parse-job-watcher").then((module) => ({
      default: module.ParseJobWatcher,
    })),
  { ssr: false },
);

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useVocabSync();
  useNormalizeOnStartup();
  useTelemetryIdentity();

  return (
    <NavigationStackProvider initialHref={pathname} currentPage={children}>
      <PageStack />
      <MaintenanceListener />
      <Toaster
        position="top-center"
        mobileOffset={{ top: "var(--mobile-toast-offset)" }}
        swipeDirections={["top", "left", "right"]}
      />
      <ParseJobWatcher />
      <BottomNav />
    </NavigationStackProvider>
  );
}
