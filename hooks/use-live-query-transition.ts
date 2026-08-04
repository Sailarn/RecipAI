import { liveQuery } from "dexie";
import { startTransition, useEffect, useRef, useState } from "react";

/**
 * Drop-in for useLiveQuery that defers *subsequent* data updates with
 * startTransition.
 *
 * The first result is committed urgently — it's the critical "show the data"
 * render, and deferring it lets boot-time work starve the transition for
 * seconds, leaving the skeleton up long after the local Dexie read resolved.
 * Later updates (a Dexie row changing) are marked non-urgent so a background
 * change can't cause a janky urgent re-render mid-interaction.
 *
 * API mirrors useLiveQuery: same querier + deps signature, returns undefined
 * while the first result is pending.
 */
export function useLiveQueryTransition<T>(
  querier: () => Promise<T> | T,
  deps: readonly unknown[],
  onError?: () => void,
): T | undefined {
  const [state, setState] = useState<T | undefined>(undefined);

  // The subscription is keyed on the caller's deps, not on onError, so without
  // this the effect would hold whichever onError it closed over when it last
  // ran — a stale handler that could set state on an unmounted owner.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let hasResolved = false;
    const subscription = liveQuery(querier).subscribe({
      next: (value) => {
        if (hasResolved) {
          startTransition(() => setState(value as T));
        } else {
          hasResolved = true;
          setState(value as T);
        }
      },
      error: () => onErrorRef.current?.(),
    });
    return () => subscription.unsubscribe();
    // biome-ignore lint/correctness/useExhaustiveDependencies: mirrors useLiveQuery — caller owns deps
  }, deps);

  return state;
}
