// lib/telemetry/consent.ts

type TelemetryMode = "full" | "minimal" | "off";

/** Full-tracking posture (personal app). To switch to consent-gated or
 *  cookieless-minimal later, change ONLY this file — call sites never check. */
function telemetryMode(): TelemetryMode {
  return "full";
}

export function isTelemetryAllowed(): boolean {
  return telemetryMode() !== "off";
}
