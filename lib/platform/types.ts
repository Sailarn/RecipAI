/**
 * Platform-capability layer. One `Platform` interface, two implementations
 * (web / telegram). Feature code calls `platform.haptics.impact("light")` and
 * never branches on the environment — the web adapter no-ops, the Telegram
 * adapter calls the native SDK. See `specs/deep-tg/architecture.md`.
 */

export type PlatformKind = "web" | "telegram";

export type HapticStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
export type HapticNotify = "success" | "error" | "warning";

export type RecipeShareInput = {
  /** Recipe id — used by the Telegram native share to mint a prepared card. */
  id: string;
  title: string;
  /** Absolute recipe URL. */
  url: string;
};

/** How a share was ultimately handled, so callers can tailor feedback. */
export type ShareResult = "shared" | "copied";

export interface Platform {
  readonly kind: PlatformKind;
  haptics: {
    impact(style?: HapticStyle): void;
    notify(type: HapticNotify): void;
    selection(): void;
  };
  share: {
    recipe(input: RecipeShareInput): Promise<ShareResult>;
  };
}
