import { PostHog } from "posthog-node";
import { serverTelemetryEnabled } from "./environment";
import type { EventName, TelemetryEvents } from "./events";

let client: PostHog | null = null;

function getClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || !serverTelemetryEnabled()) return null;
  if (!client) {
    const onVercel = Boolean(process.env.VERCEL);
    client = new PostHog(key, {
      host: "https://eu.i.posthog.com",
      flushAt: onVercel ? 1 : 20,
      flushInterval: onVercel ? 0 : 10_000,
    });
  }
  return client;
}

export function captureServerEvent<E extends EventName>(
  name: E,
  properties?: TelemetryEvents[E],
  distinctId = "server",
): void {
  getClient()?.capture({
    distinctId,
    event: name,
    properties,
  });
}
