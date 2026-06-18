"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
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

const EmbedConsentModal = dynamic(
  () =>
    import("@/components/embed-consent-modal").then((module) => ({
      default: module.EmbedConsentModal,
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
      <Toaster
        position="top-center"
        mobileOffset={{ top: "var(--mobile-toast-offset)" }}
        swipeDirections={["left", "right"]}
      />
      <ParseJobWatcher />
      <EmbedConsentModal />
      <BottomNav />
    </NavigationStackProvider>
  );
}
