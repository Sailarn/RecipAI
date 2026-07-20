import type { PlatformKind } from "./types";

/**
 * Presence of a UI surface, keyed by capability rather than platform name — so
 * a component hides for a *reason* ("linking unsupported") instead of "it's
 * Telegram". Flip a cell here to change what shows on a platform; call sites
 * never mention the environment. See `specs/deep-tg/architecture.md`.
 */
export type Feature =
  | "signInOptions" // Google/Passkey/OIDC login buttons + the login route
  | "accountLinking" // the "Connected accounts" card
  | "accountActions" // sign out + "Open bot" — meaningless in Telegram (identity is fixed)
  | "pushNotifications" // web-push toggle
  | "pwaInstall"; // "Add to Home Screen" row

export const FEATURES: Record<PlatformKind, Record<Feature, boolean>> = {
  web: {
    signInOptions: true,
    accountLinking: true,
    accountActions: true,
    pushNotifications: true,
    pwaInstall: true,
  },
  telegram: {
    signInOptions: false,
    accountLinking: false,
    accountActions: false,
    pushNotifications: false,
    pwaInstall: false,
  },
};
