// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { initPostHogClient } from "@/lib/telemetry/posthog-client";

if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Enable sending user PII (Personally Identifiable Information)
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
    sendDefaultPii: true,
    tracesSampleRate: 0.2,

    // The service worker is registered by @serwist/next's auto-injected script.
    // Its registration promise rejects (unhandled) in environments where SW
    // registration can't complete — crawlers, headless browsers, private mode.
    // The app degrades fine without a service worker, so these are noise, not
    // user-facing bugs: `Rejected` and the `reading 'waiting'` TypeError both
    // originate from that registration path.
    ignoreErrors: [/^Rejected$/, /reading 'waiting'/],
  });
}

initPostHogClient();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
