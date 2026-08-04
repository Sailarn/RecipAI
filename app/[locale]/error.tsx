"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { ErrorFallback } from "@/components/page-error-boundary/error-fallback";

// Route-level boundary for errors thrown outside the client page stack (server
// render, layout, route segment). Errors inside a pushed page are handled by
// PageErrorBoundary, which keeps the shell alive; this one is the backstop
// below app/global-error.tsx, which is a bare unstyled English page.
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <ErrorFallback onRetry={reset} />;
}
