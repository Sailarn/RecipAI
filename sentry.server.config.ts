// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { getBuildId } from "@/lib/build-id";

if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // User PII (IP, user info, cookies, headers, bodies) is collected by
    // default since v11 — what v10 needed sendDefaultPii: true for.

    // See instrumentation-client.ts for why this is a tag and not `release`.
    initialScope: { tags: { build_id: getBuildId() } },
  });
}
