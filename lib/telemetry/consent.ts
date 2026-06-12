// lib/telemetry/consent.ts

export type TelemetryMode = "full" | "minimal" | "off";

/** Full-tracking posture (personal app). To switch to consent-gated or
 *  cookieless-minimal later, change ONLY this file — call sites never check. */
export function telemetryMode(): TelemetryMode {
  return "full";
}

export function isTelemetryAllowed(): boolean {
  return telemetryMode() !== "off";
}
