/**
 * Thin console wrapper that is silent in production and delegates to the
 * console in development. Use this instead of calling `console.*` directly so
 * dev logs never ship to prod (browser or server) console output.
 *
 * Error reporting is a separate concern: server errors go to Sentry via
 * `ApiError.capture` / `ApiError.internal`, and component errors via the
 * re-throw pattern. This logger does not send anything to Sentry.
 */

const isDevelopment = process.env.NODE_ENV !== "production";

type LogArgs = readonly unknown[];

export const logger = {
  debug: (...args: LogArgs) => {
    if (isDevelopment) console.debug(...args);
  },
  info: (...args: LogArgs) => {
    if (isDevelopment) console.info(...args);
  },
  warn: (...args: LogArgs) => {
    if (isDevelopment) console.warn(...args);
  },
  error: (...args: LogArgs) => {
    if (isDevelopment) console.error(...args);
  },
};
