"use client";

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

export function NavigationStackProvider({
  children,
  initialHref,
  initialElement,
}: {
  children: React.ReactNode;
  initialHref: string;
  initialElement: React.ReactNode;
}) {
  const [entries, setEntries] = useState<StackEntry[]>([
    { id: "root", href: initialHref, element: initialElement },
  ]);
  const absorbingPop = useRef(false);

  // Absorb native back: when popstate fires, re-push the URL the browser just
  // consumed so history stays under our control, then pop our stack instead.
  useEffect(() => {
    const onPopState = () => {
      if (absorbingPop.current) return;
      setEntries((prev) => {
        if (prev.length <= 1) return prev; // nothing to pop — let the browser navigate
        absorbingPop.current = true;
        // Re-add the entry the browser just removed from history
        history.pushState(null, "", prev[prev.length - 1].href);
        setTimeout(() => {
          absorbingPop.current = false;
        }, 0);
        return prev.slice(0, -1);
      });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const push = useCallback((href: string, element: React.ReactNode) => {
    const id = `${Date.now()}-${Math.random()}`;
    history.pushState(null, "", href);
    setEntries((prev) => [...prev, { id, href, element }]);
  }, []);

  const pop = useCallback(() => {
    setEntries((prev) => {
      if (prev.length <= 1) return prev;
      history.pushState(null, "", prev[prev.length - 2].href);
      return prev.slice(0, -1);
    });
  }, []);

  const reset = useCallback((href: string, element: React.ReactNode) => {
    history.pushState(null, "", href);
    setEntries([{ id: `${Date.now()}`, href, element }]);
  }, []);

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
  if (!ctx) throw new Error("useNavigationStack outside NavigationStackProvider");
  return ctx;
}
