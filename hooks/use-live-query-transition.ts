import { liveQuery } from "dexie";
import { startTransition, useEffect, useState } from "react";

/**
 * Drop-in for useLiveQuery that wraps each data update in startTransition.
 *
 * useLiveQuery fires urgent React state updates whenever Dexie resolves —
 * on first page mount these arrive in rapid succession and cause frame drops
 * that appear as nav/page stutter. startTransition marks them as non-urgent
 * so the browser can paint the skeleton between frames before committing the
 * content render.
 *
 * API mirrors useLiveQuery: same querier + deps signature, returns undefined
 * while the first result is pending.
 */
export function useLiveQueryTransition<T>(
  querier: () => Promise<T> | T,
  deps: readonly unknown[],
): T | undefined {
  const [state, setState] = useState<T | undefined>(undefined);

  useEffect(() => {
    const subscription = liveQuery(querier).subscribe({
      next: (value) => startTransition(() => setState(value as T)),
      error: () => {},
    });
    return () => subscription.unsubscribe();
    // biome-ignore lint/correctness/useExhaustiveDependencies: mirrors useLiveQuery — caller owns deps
  }, deps);

  return state;
}
