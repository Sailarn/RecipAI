/**
 * SSR-safe access to the Telegram Mini App SDK (`window.Telegram.WebApp`).
 *
 * The app ships one bundle for both the browser/PWA and the Telegram in-app
 * WebView. Everything here no-ops (or returns `false`/`undefined`) when the SDK
 * is absent, so callers never need their own `typeof window` guards.
 *
 * See `specs/telegram-mini-app.md` and `docs/explanation/telegram-mini-app.md`.
 */

export type TelegramThemeParams = {
  bg_color?: string;
  secondary_bg_color?: string;
  text_color?: string;
  button_color?: string;
  button_text_color?: string;
};

export type TelegramUser = {
  id: number;
  first_name?: string;
  language_code?: string;
};

export type TelegramBackButton = {
  show: () => void;
  hide: () => void;
  onClick: (handler: () => void) => void;
  offClick: (handler: () => void) => void;
};

export type TelegramMainButton = {
  setText: (text: string) => void;
  show: () => void;
  hide: () => void;
  enable: () => void;
  disable: () => void;
  showProgress: (leaveActive?: boolean) => void;
  hideProgress: () => void;
  onClick: (handler: () => void) => void;
  offClick: (handler: () => void) => void;
};

export type TelegramHomeScreenStatus =
  | "unsupported"
  | "unknown"
  | "added"
  | "missed";

export type TelegramWebApp = {
  initData: string;
  initDataUnsafe: { user?: TelegramUser; start_param?: string };
  version: string;
  colorScheme: "light" | "dark";
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  viewportStableHeight: number;
  ready: () => void;
  expand: () => void;
  close: () => void;
  onEvent: (event: string, handler: () => void) => void;
  offEvent: (event: string, handler: () => void) => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  disableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  openLink?: (url: string) => void;
  openTelegramLink?: (url: string) => void;
  addToHomeScreen?: () => void;
  checkHomeScreenStatus?: (
    callback: (status: TelegramHomeScreenStatus) => void,
  ) => void;
  BackButton: TelegramBackButton;
  MainButton: TelegramMainButton;
};

type TelegramWindow = Window & {
  Telegram?: { WebApp?: TelegramWebApp };
};

const SDK_SRC = "https://telegram.org/js/telegram-web-app.js";
const LAUNCH_PARAM_MARKER = "tgWebAppData";

/**
 * The live SDK instance, or `undefined` outside Telegram / on the server.
 * A non-empty `initData` is required — the object also exists (empty) when the
 * script loads in a normal browser tab, which does not count as "in Telegram".
 */
export function getTelegramWebApp(): TelegramWebApp | undefined {
  if (typeof window === "undefined") return undefined;
  const webApp = (window as TelegramWindow).Telegram?.WebApp;
  if (!webApp || !webApp.initData) return undefined;
  return webApp;
}

/**
 * True when the page was launched from Telegram. Detected from the SDK when
 * present, and otherwise from the `tgWebAppData` launch parameter Telegram
 * appends to the URL hash — so it is reliable even before the SDK script loads.
 */
export function isTelegramEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  if (getTelegramWebApp()) return true;
  return (
    window.location.hash.includes(LAUNCH_PARAM_MARKER) ||
    window.location.search.includes(LAUNCH_PARAM_MARKER)
  );
}

/**
 * Injects the Telegram SDK script and resolves once `window.Telegram.WebApp`
 * is available. Resolves immediately if already loaded. Rejects if the script
 * fails to load. Client-only.
 */
export function loadTelegramSdk(): Promise<TelegramWebApp | undefined> {
  if (typeof window === "undefined") return Promise.resolve(undefined);
  const existing = (window as TelegramWindow).Telegram?.WebApp;
  if (existing) return Promise.resolve(getTelegramWebApp());

  return new Promise((resolve, reject) => {
    const alreadyRequested = document.querySelector<HTMLScriptElement>(
      `script[src="${SDK_SRC}"]`,
    );
    const script = alreadyRequested ?? document.createElement("script");
    const handleLoad = () => resolve(getTelegramWebApp());
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Failed to load Telegram WebApp SDK")),
      { once: true },
    );
    if (!alreadyRequested) {
      script.src = SDK_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}
