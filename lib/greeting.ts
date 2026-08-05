export type GreetingPeriod = "morning" | "afternoon" | "evening";

/**
 * Returns the time-of-day period for the recipes page greeting.
 *
 * Accepts an optional `hour` (0–23) so the function is pure and testable
 * without mocking the clock. Defaults to the current hour. The caller maps
 * the period to a translated string — this stays locale-agnostic.
 */
export function getGreeting(
  hour: number = new Date().getHours(),
): GreetingPeriod {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}
