import { getTelegramWebApp } from "./webapp";

// Keys for the user preferences we persist in Telegram CloudStorage, so a Mini
// App reopen restores them (localStorage/cookies get cleared between sessions).
export const CLOUD_PREF_KEYS = {
  theme: "theme",
  locale: "locale",
} as const;

/**
 * Reads a CloudStorage value, wrapping Telegram's error-first callback in a
 * promise. Resolves `null` outside Telegram, on older clients without
 * CloudStorage, or on any error — callers treat that as "no stored preference".
 */
export function getCloudItem(key: string): Promise<string | null> {
  const storage = getTelegramWebApp()?.CloudStorage;
  if (!storage?.getItem) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      storage.getItem(key, (error, value) =>
        resolve(error ? null : (value ?? null)),
      );
    } catch {
      resolve(null);
    }
  });
}

/**
 * Writes a CloudStorage value (fire-and-forget friendly). Resolves `false` when
 * unsupported or on error, so a failure never breaks the setting change.
 */
export function setCloudItem(key: string, value: string): Promise<boolean> {
  const storage = getTelegramWebApp()?.CloudStorage;
  if (!storage?.setItem) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      storage.setItem(key, value, (error, success) =>
        resolve(!error && success !== false),
      );
    } catch {
      resolve(false);
    }
  });
}
