"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { NavigationStackProvider } from "@/lib/navigation-stack";
import { PageStack } from "@/components/page-stack";

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
    <NavigationStackProvider initialHref={pathname} initialElement={children}>
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 mx-auto max-w-7xl pb-24 w-full">
          <PageStack />
        </main>
        <Toaster position="bottom-center" />
        <ParseJobWatcher />
        <BottomNav />
      </div>
    </NavigationStackProvider>
  );
}
