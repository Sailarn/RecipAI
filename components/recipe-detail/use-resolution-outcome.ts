import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/telemetry";

/**
 * How a recipe detail view ended up.
 *
 * - `local` — found in Dexie, the ordinary case
 * - `shared` — not on this device, resolved as someone else's public recipe
 * - `not_found` — neither, so the private guard is shown
 */
export type ResolutionOutcome = "local" | "shared" | "not_found";

/** Long enough that a slow phone on a slow network resolves first, short
 *  enough that a user has not yet given up and closed the app. */
export const STUCK_AFTER_MS = 8000;

interface ResolutionState {
  loading: boolean;
  hasRecipe: boolean;
  hasPublicRecipe: boolean;
  publicCheckDone: boolean;
  ownerPullDone: boolean;
  awaitingTelegramAutoSignIn: boolean;
}

/**
 * Mirrors the render branches in `RecipeDetail`. `null` means "still a
 * skeleton" — not yet a terminal state.
 *
 * Kept as a pure function next to the hook so the mapping can be tested
 * directly: it is the part that silently drifts when the render changes.
 */
export function resolveOutcome(
  state: ResolutionState,
): ResolutionOutcome | null {
  if (state.loading) return null;
  if (state.hasRecipe) return "local";
  if (state.hasPublicRecipe) return "shared";
  if (!state.publicCheckDone) return null;
  if (state.awaitingTelegramAutoSignIn || !state.ownerPullDone) return null;
  return "not_found";
}

/**
 * Reports how — and whether — a recipe detail view resolved.
 *
 * Before this, only the `local` branch emitted anything (`recipe_viewed`, which
 * is gated on the Dexie recipe). A shared recipe that rendered perfectly and
 * one that hung on a skeleton forever produced byte-identical telemetry: a
 * `$pageview` and nothing else. That blind spot covered exactly the path every
 * share link takes.
 *
 * Two events rather than one, deliberately. `recipe_detail_stuck` fires on a
 * timer and `recipe_detail_resolved` fires whenever resolution actually lands,
 * so "stuck then resolved after 20s" (slow) stays distinguishable from "stuck,
 * never resolved" (broken) — which collapsing them into a single terminal
 * event would lose.
 */
export function useResolutionOutcome(outcome: ResolutionOutcome | null): void {
  const resolvedRef = useRef(false);
  const stuckRef = useRef(false);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    if (outcome === null || resolvedRef.current) return;
    resolvedRef.current = true;
    trackEvent("recipe_detail_resolved", {
      outcome,
      duration_ms: Date.now() - startedAtRef.current,
      was_stuck: stuckRef.current,
    });
  }, [outcome]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (resolvedRef.current) return;
      stuckRef.current = true;
      trackEvent("recipe_detail_stuck", { after_ms: STUCK_AFTER_MS });
    }, STUCK_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);
}
