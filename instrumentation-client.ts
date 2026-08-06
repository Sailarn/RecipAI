// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { getBuildId } from "@/lib/build-id";
import { scheduleIdle } from "@/lib/schedule-idle";

if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Enable sending user PII (Personally Identifiable Information)
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
    sendDefaultPii: true,

    // A tag, deliberately not `release`. withSentryConfig detects its own
    // release name and uploads source maps under it; overriding `release` here
    // with our (truncated) build id would orphan those maps and leave every
    // stack trace minified. The tag gives the same "which build" filter with
    // none of that risk, and matches the build_id property on PostHog events.
    initialScope: { tags: { build_id: getBuildId() } },

    // The service worker is registered by @serwist/next's auto-injected script.
    // Its registration promise rejects (unhandled) in environments where SW
    // registration can't complete — crawlers, headless browsers, private mode.
    // The app degrades fine without a service worker, so these are noise, not
    // user-facing bugs: `Rejected` and the `reading 'waiting'` TypeError both
    // originate from that registration path.
    ignoreErrors: [/^Rejected$/, /reading 'waiting'/],
  });
}

// Analytics is never worth competing with first paint: both this module and
// posthog-js itself are pulled in once the browser is idle. Any event fired
// before the load lands is queued inside the client and replayed.
scheduleIdle(() => {
  import("@/lib/telemetry/posthog-client")
    .then((posthogClientModule) => posthogClientModule.initPostHogClient())
    .catch(() => {});

  // Answers "is this device running the code we think it is?" — the question
  // that had no answer when an Android user's recipes silently failed to load.
  // Swallowed like the init above: a diagnostic must never be the thing that
  // breaks a boot, and it runs too early for the re-throw pattern (there is no
  // error boundary above instrumentation).
  import("@/lib/pwa/build-freshness")
    .then((buildFreshnessModule) => {
      buildFreshnessModule.watchServiceWorkerTakeover();
      return buildFreshnessModule.reportBuildFreshness();
    })
    .catch(() => {});

  // Page zoom in an installed PWA cannot be prevented from the page, so the
  // only remedy is making it visible — otherwise it presents as "the app
  // suddenly renders smaller" with nothing anywhere to explain it.
  import("@/lib/pwa/display-scale")
    .then((displayScaleModule) => displayScaleModule.reportDisplayScale())
    .catch(() => {});
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
