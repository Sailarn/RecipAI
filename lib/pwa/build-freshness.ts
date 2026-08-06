import { getBuildId } from "@/lib/build-id";
import { api } from "@/lib/routes";
import { trackEvent } from "@/lib/telemetry";

/**
 * Detects a document running code from a previous deploy.
 *
 * The build id compiled into this bundle describes the document the browser is
 * running. `/api/build` reports what the server is serving *now* — the service
 * worker routes `/api/*` through NetworkOnly, so that answer is never cached,
 * which is why it has to be asked over HTTP rather than read from a value that
 * would have been baked into the same stale bundle.
 *
 * When the two disagree, the page is running code the server has moved on
 * from. That used to be a silent failure: the document painted, its chunk URLs
 * 404'd, the app never hydrated, and nothing reached Sentry because none of the
 * app's JS ran. Versioning the service worker's page cache should make this
 * unreachable — so an event here is either a bug worth knowing about or an
 * ordinary mid-session deploy, and the timestamps tell those apart.
 */
export async function reportBuildFreshness(): Promise<void> {
  const documentBuildId = getBuildId();
  // Nothing to compare against in a build with no id compiled in (a bare
  // `next dev`), and reporting every such load would be pure noise.
  if (documentBuildId === "unknown") return;

  const response = await fetch(api.build, { cache: "no-store" });
  if (!response.ok) return;

  const { buildId: serverBuildId } = (await response.json()) as {
    buildId?: string;
  };
  if (!serverBuildId || serverBuildId === documentBuildId) return;

  trackEvent("stale_document_detected", {
    document_build_id: documentBuildId,
    server_build_id: serverBuildId,
  });

  // Pull the new service worker rather than forcing a reload. Its install
  // precaches the current build and its activate sweeps older page caches, so
  // the next navigation is clean — without yanking the page out from under
  // someone who may be mid-edit. A forced reload also risks a loop against a
  // rolling deploy still serving both builds.
  const registration = await navigator.serviceWorker?.getRegistration();
  await registration?.update();
}

/**
 * Reports a service worker taking control of an already-open page.
 *
 * `skipWaiting` + `clientsClaim` mean a deploy swaps the worker under live
 * tabs. The page keeps running the old build's JS against the new build's
 * caches, which is the shape of "it broke, then fixed itself after a while" —
 * a reload silently repairs it, so it otherwise leaves no trace at all.
 */
export function watchServiceWorkerTakeover(): void {
  navigator.serviceWorker?.addEventListener("controllerchange", () => {
    trackEvent("sw_controller_changed");
  });
}
