import { liveQuery } from "dexie";
import { startTransition, useEffect, useState } from "react";

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
      error: () => onError?.(),
    });
    return () => subscription.unsubscribe();
    // biome-ignore lint/correctness/useExhaustiveDependencies: mirrors useLiveQuery — caller owns deps
  }, deps);

  return state;
}
