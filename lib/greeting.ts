/**
 * Returns a time-of-day greeting string.
 *
 * Accepts an optional `hour` (0–23) so the function is pure and testable
 * without mocking the clock. Defaults to the current hour.
 *
 * TODO: return a translation key instead of a plain string once i18n is wired up.
 */
export function getGreeting(hour: number = new Date().getHours()): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
