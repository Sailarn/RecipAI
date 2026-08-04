import { captureError } from "@/lib/telemetry";

// One-shot Dexie migrations run in the background, so a failure has no visible
// symptom — the data just stays in its old shape. Report rather than swallow;
// no user-facing message, since there is nothing the user could do and the app
// works either way.
function reportFailure(source: string) {
  return (error: unknown) => {
    captureError(error, { tags: { source: `startup-migration:${source}` } });
  };
}

/**
 * Every one-shot Dexie upgrade the app runs at startup, in one place.
 *
 * All of them are self-limiting — a repeat run is a cheap no-op — and all are
 * lazily imported so the normalize/vocab pipelines stay off the startup load
 * path. They are deliberately not awaited: none of them gates the UI.
 *
 * - **renormalize-recipes** — upgrades older recipes to the index-aligned
 *   `canonicalIngredientIds` format, so per-ingredient pantry dots (including
 *   cross-language) work.
 * - **migrate-recipe-shape** — legacy single-`modifier`/string-`section`
 *   recipes to `modifiers[]` + structured `sections`/`sectionId`. Skips any
 *   recipe that already has a `sections` array.
 * - **reconcile-vocab** — clears stale duplicate vocab rows from the
 *   pre-merge-on-enrich era, resets the delta-sync watermark, re-pulls clean
 *   vocab and re-normalizes recipes against the surviving canonical ids.
 *   Guarded once-per-device by the "vocabReconciled_v1" key. Must ship *after*
 *   the server-side cleanup-dup-ingredients.sql script, or the re-pull
 *   restores the old duplicates.
 */
export function runStartupMigrations(): void {
  import("@/lib/db/renormalize-recipes")
    .then((module) => module.renormalizeOutdatedRecipes())
    .catch(reportFailure("renormalize-recipes"));

  import("@/lib/db/migrate-recipe-shape")
    .then((module) => module.migrateLegacyRecipeShapes())
    .catch(reportFailure("migrate-recipe-shape"));

  import("@/lib/db/reconcile-vocab")
    .then((module) => module.reconcileVocab())
    .catch(reportFailure("reconcile-vocab"));
}

/**
 * Normalizes recipes pulled without canonical ingredient ids (e.g. a Telegram
 * bot recipe saved server-side without them) so their pantry dots work without
 * waiting for an app restart. Runs after each reconcile, not at startup.
 */
export function normalizePulledRecipes(): void {
  import("@/lib/db/normalize-pending-recipes")
    .then((module) => module.normalizePendingRecipes())
    .catch(reportFailure("normalize-pending-recipes"));
}
