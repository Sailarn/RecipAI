/**
 * Telemetry vendors (PostHog, Axiom) send data only in production, mirroring
 * the `NODE_ENV` gate on the Sentry config files.
 *
 * The `TELEMETRY_DEV` escape hatch lets you verify the pipeline locally without
 * editing code: set `TELEMETRY_DEV=1` (server) and/or
 * `NEXT_PUBLIC_TELEMETRY_DEV=1` (client) in `.env.local`. Leave both unset for
 * normal local development — nothing is sent.
 */

export function serverTelemetryEnabled(): boolean {
  return (
    process.env.NODE_ENV === "production" || process.env.TELEMETRY_DEV === "1"
  );
}

export function clientTelemetryEnabled(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_TELEMETRY_DEV === "1"
  );
}
