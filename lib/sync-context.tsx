"use client";

import { createContext, useContext } from "react";
import { type SyncStatus, useSyncOnLogin } from "@/hooks/use-sync-on-login";

type SyncContextValue = {
  triggerSync: () => Promise<void>;
  status: SyncStatus;
};

const SyncContext = createContext<SyncContextValue | null>(null);

/**
 * Owns useSyncOnLogin() for the app's lifetime. Must render inside
 * NavigationStackProvider (the hook calls useNavigate() for the review-toast
 * action) and must NOT be inside PageStack's per-page subtree — mounting it
 * there would tie sync/migration lifecycle to whichever tab happens to be
 * showing, re-running on every tab switch instead of once per session.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { triggerSync, status } = useSyncOnLogin();

  return (
    <SyncContext.Provider value={{ triggerSync, status }}>
      {children}
    </SyncContext.Provider>
  );
}

/** Manual sync trigger (e.g. pull-to-refresh) — the app-lifetime sync itself runs automatically. */
export function useTriggerSync() {
  const context = useContext(SyncContext);
  if (!context) throw new Error("useTriggerSync outside SyncProvider");
  return context.triggerSync;
}

const NO_SYNC: SyncStatus = { syncing: false, newRecipes: 0, finishedAt: 0 };

/** Background sync status, for the "Updating recipes…" message. */
export function useSyncStatus(): SyncStatus {
  return useContext(SyncContext)?.status ?? NO_SYNC;
}
