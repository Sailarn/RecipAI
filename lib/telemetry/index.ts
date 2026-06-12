// lib/telemetry/index.ts
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { isTelemetryAllowed } from "./consent";
import type { EventName, TelemetryEvents } from "./events";

const isServer = typeof window === "undefined";

/** Telemetry must never break the app: every public function is synchronous
 *  fire-and-forget; vendor work happens behind a dynamic import whose failure
 *  is swallowed. */
function safely(work: () => unknown): void {
  try {
    const result = work();
    if (result instanceof Promise) result.catch(() => {});
  } catch {
    // swallow — a vendor outage costs data, never a render or a request
  }
}

export function trackEvent<E extends EventName>(
  name: E,
  properties?: TelemetryEvents[E],
): void {
  if (!isTelemetryAllowed()) return;
  safely(async () => {
    if (isServer) {
      const { captureServerEvent } = await import("./posthog-server");
      captureServerEvent(name, properties);
    } else {
      const { captureClientEvent } = await import("./posthog-client");
      captureClientEvent(name, properties);
    }
  });
}

export function identifyUser(
  userId: string,
  personProperties?: Record<string, unknown>,
): void {
  if (!isTelemetryAllowed() || isServer) return;
  safely(async () => {
    const { identifyClient } = await import("./posthog-client");
    identifyClient(userId, personProperties);
  });
}

export function resetIdentity(): void {
  if (isServer) return;
  safely(async () => {
    const { resetClient } = await import("./posthog-client");
    resetClient();
  });
}

export function captureError(
  error: unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  },
): void {
  safely(() => {
    Sentry.captureException(error, {
      tags: context?.tags,
      extra: context?.extra,
    });
  });
}

export function log(
  level: "info" | "warn" | "error",
  message: string,
  fields?: Record<string, unknown>,
): void {
  // Two intentional sinks: logger prints in dev only (silent in prod);
  // Axiom ships in any environment where AXIOM_TOKEN is set — not redundant.
  safely(() =>
    fields ? logger[level](message, fields) : logger[level](message),
  );
  if (!isServer) return;
  safely(async () => {
    const { sendLog } = await import("./axiom");
    sendLog(level, message, fields);
  });
}
