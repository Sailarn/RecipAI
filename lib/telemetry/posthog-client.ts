import posthog from "posthog-js";
import { clientTelemetryEnabled } from "./environment";
import type { EventName, TelemetryEvents } from "./events";

let initialized = false;

export function initPostHogClient(): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || initialized || !clientTelemetryEnabled()) return;
  posthog.init(key, {
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    capture_pageview: "history_change",
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    session_recording: { maskAllInputs: true },
  });
  initialized = true;
}

export function captureClientEvent<E extends EventName>(
  name: E,
  properties?: TelemetryEvents[E],
): void {
  initPostHogClient();
  if (!initialized) return;
  posthog.capture(name, properties);
}

export function identifyClient(
  userId: string,
  personProperties?: Record<string, unknown>,
): void {
  initPostHogClient();
  if (!initialized) return;
  posthog.identify(userId, personProperties);
}

export function resetClient(): void {
  if (!initialized) return;
  posthog.reset();
}
