"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type StackEntry = {
  id: string;
  href: string;
  element: React.ReactNode;
};

type NavigationStackCtx = {
  entries: StackEntry[];
  push: (href: string, element: React.ReactNode) => void;
  pop: () => void;
  reset: (href: string, element: React.ReactNode) => void;
  canPop: boolean;
};

const Ctx = createContext<NavigationStackCtx | null>(null);

// Module-level flag set synchronously before a native-back pop so PageStack
// can skip the slide-out animation (iOS/Chrome already animated it).
let _nativePopPending = false;
export const isNativePopPending = () => _nativePopPending;
export const clearNativePopPending = () => {
  _nativePopPending = false;
};

export function NavigationStackProvider({
  children,
  initialHref,
  currentPage,
}: {
  children: React.ReactNode;
  initialHref: string;
  currentPage: React.ReactNode;
}) {
  const pathname = usePathname();
  const initialEntry: StackEntry = {
    id: "root",
    href: initialHref,
    element: currentPage,
  };

  const entriesRef = useRef<StackEntry[]>([initialEntry]);
  const [entries, setEntries] = useState<StackEntry[]>([initialEntry]);

  const updateEntries = useCallback((next: StackEntry[]) => {
    entriesRef.current = next;
    setEntries(next);
  }, []);

  // Prevents the pathname sync from resetting the stack when we call
  // history.pushState ourselves (Next.js intercepts it and updates usePathname).
  const stackPushing = useRef(false);

  // Tracks the last currentPage written into an entry via this sync effect.
  // Initialized to currentPage so the first navigation can detect stale content.
  const lastSyncedPage = useRef<React.ReactNode>(currentPage);

  // Sync with real Next.js navigations (Link, router.push, etc.).
  useEffect(() => {
    if (stackPushing.current) {
      stackPushing.current = false;
      lastSyncedPage.current = currentPage;
      return;
    }
    const prev = entriesRef.current;
    const top = prev[prev.length - 1];

    if (top?.href === pathname) {
      // No navigation occurred, or currentPage updated before pathname (Case B).
      // In Case B the next effect run will fire with the new pathname and do
      // the RESET with the already-correct currentPage — nothing to do here.
      return;
    }

    // pathname changed → navigation. But if currentPage hasn't updated yet
    // (stale: it still equals the last synced value), defer: don't create an
    // entry with the wrong element. The effect will re-fire when currentPage
    // catches up and we'll do the RESET then with the correct element.
    if (currentPage === lastSyncedPage.current) return;

    lastSyncedPage.current = currentPage;
    updateEntries([
      { id: `nextjs-${Date.now()}`, href: pathname, element: currentPage },
    ]);
  }, [pathname, currentPage, updateEntries]);

  // Handle native back gesture / browser back button.
  // We do NOT re-push the URL (no absorb) — that caused extra history entries,
  // required extra back-swipes to exit the app, and produced double animations.
  // Instead we just pop our visual stack and let Next.js handle the URL naturally.
  // The pathname sync guard (top.href === pathname) prevents the stack from
  // being reset when Next.js processes the same popstate.
  useEffect(() => {
    const onPopState = () => {
      const prev = entriesRef.current;
      if (prev.length <= 1) return; // nothing to pop — let browser navigate
      _nativePopPending = true;
      updateEntries(prev.slice(0, -1));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [updateEntries]);

  const push = useCallback(
    (href: string, element: React.ReactNode) => {
      const id = `${Date.now()}-${Math.random()}`;
      stackPushing.current = true;
      history.pushState(null, "", href);
      updateEntries([...entriesRef.current, { id, href, element }]);
    },
    [updateEntries],
  );

  const pop = useCallback(() => {
    const prev = entriesRef.current;
    if (prev.length <= 1) return;
    stackPushing.current = true;
    history.pushState(null, "", prev[prev.length - 2].href);
    updateEntries(prev.slice(0, -1));
  }, [updateEntries]);

  const reset = useCallback(
    (href: string, element: React.ReactNode) => {
      stackPushing.current = true;
      history.pushState(null, "", href);
      updateEntries([{ id: `${Date.now()}`, href, element }]);
    },
    [updateEntries],
  );

  return (
    <Ctx.Provider
      value={{ entries, push, pop, reset, canPop: entries.length > 1 }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useNavigationStack() {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useNavigationStack outside NavigationStackProvider");
  return ctx;
}
