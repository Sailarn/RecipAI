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

export type TelegramHapticStyle =
  | "light"
  | "medium"
  | "heavy"
  | "rigid"
  | "soft";
export type TelegramHapticNotification = "error" | "success" | "warning";

export type TelegramHapticFeedback = {
  impactOccurred: (style: TelegramHapticStyle) => void;
  notificationOccurred: (type: TelegramHapticNotification) => void;
  selectionChanged: () => void;
};

export type TelegramHomeScreenStatus =
  | "unsupported"
  | "unknown"
  | "added"
  | "missed";

// Per-user key/value store that persists across app reopens and devices —
// unlike localStorage/cookies, which the WebView drops between sessions. The
// callbacks are error-first. Present from Bot API 6.9; optional so older
// clients degrade gracefully.
export type TelegramCloudStorage = {
  setItem: (
    key: string,
    value: string,
    callback?: (error: string | null, success?: boolean) => void,
  ) => void;
  getItem: (
    key: string,
    callback: (error: string | null, value?: string) => void,
  ) => void;
  removeItem: (
    key: string,
    callback?: (error: string | null, success?: boolean) => void,
  ) => void;
};

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
  shareMessage?: (
    preparedMessageId: string,
    callback?: (sent: boolean) => void,
  ) => void;
  addToHomeScreen?: () => void;
  checkHomeScreenStatus?: (
    callback: (status: TelegramHomeScreenStatus) => void,
  ) => void;
  BackButton: TelegramBackButton;
  MainButton: TelegramMainButton;
  HapticFeedback?: TelegramHapticFeedback;
  CloudStorage?: TelegramCloudStorage;
};

type TelegramWindow = Window & {
  Telegram?: { WebApp?: TelegramWebApp };
};

const SDK_SRC = "https://telegram.org/js/telegram-web-app.js";
const LAUNCH_PARAM_MARKER = "tgWebAppData";
// Once launched from Telegram, remember it for the tab session. A reload (e.g.
// the theme toggle, or iOS foreground) can drop the `tgWebAppData` URL hash, so
// without this the app would mistake itself for the plain web after a reload.
const LAUNCH_FLAG_KEY = "recipai:tg-launched";
// The decoded launch payload, remembered for the same reason (and one more): an
// in-app navigation rewrites the URL and drops the hash within a single page
// load — a `recipe_<id>` deep link pushes the recipe view before the silent
// sign-in reads initData — so the live hash is often already gone by then.
const LAUNCH_DATA_KEY = "recipai:tg-launch-data";

function readLaunchFlag(): boolean {
  try {
    return sessionStorage.getItem(LAUNCH_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberLaunched(): void {
  try {
    sessionStorage.setItem(LAUNCH_FLAG_KEY, "1");
  } catch {}
}

function readRememberedLaunchData(): string | undefined {
  try {
    return sessionStorage.getItem(LAUNCH_DATA_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function rememberLaunchData(raw: string): void {
  try {
    sessionStorage.setItem(LAUNCH_DATA_KEY, raw);
  } catch {}
}

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
  const hasLaunchParams =
    (window.location.hash || "").includes(LAUNCH_PARAM_MARKER) ||
    (window.location.search || "").includes(LAUNCH_PARAM_MARKER);
  if (hasLaunchParams) {
    rememberLaunched();
    return true;
  }
  return readLaunchFlag();
}

/**
 * The raw `tgWebAppData` launch hash Telegram appends to the URL, decoded
 * once. This is the same payload `webApp.initData` holds once the SDK has
 * caught up — reading it directly lets a deep link resolve (a start param,
 * or a full sign-in) before, or even without, the SDK object ever populating.
 *
 * The live hash wins whenever it's present (and is remembered for the tab
 * session as it's read); once an in-app navigation has dropped it from the
 * URL, the remembered copy is returned instead — so a deep-link launch's
 * silent sign-in still has initData after the recipe view has been pushed.
 */
function getLaunchDataFromHash(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const source = `${window.location.hash}&${window.location.search}`;
  const match = source.match(/tgWebAppData=([^&]+)/);
  if (!match) return readRememberedLaunchData();
  try {
    const raw = decodeURIComponent(match[1]);
    rememberLaunchData(raw);
    return raw;
  } catch {
    return readRememberedLaunchData();
  }
}

/**
 * The Mini App launch `start_param` (from a `?startapp=…` deep link), read
 * synchronously so a deep link can be resolved before the SDK finishes loading.
 * Prefers the live SDK; otherwise parses it out of the `tgWebAppData` launch
 * hash Telegram appends to the URL. Returns `undefined` when absent.
 */
export function getLaunchStartParam(): string | undefined {
  const webApp = getTelegramWebApp();
  if (webApp) return webApp.initDataUnsafe.start_param;
  const raw = getLaunchDataFromHash();
  if (!raw) return undefined;
  try {
    return new URLSearchParams(raw).get("start_param") ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * The raw `initData` payload Telegram signs for this launch — Telegram can
 * populate `webApp.initData` *after* the SDK script's `load` event fires
 * (confirmed on deep-link launches specifically — see gotchas.md), so a
 * caller that needs initData right away (sign-in) shouldn't wait on the SDK
 * object resolving. Falls back to the `tgWebAppData` launch hash, which
 * carries the identical payload and is available from the first paint.
 */
export function getLaunchInitData(): string | undefined {
  const webApp = getTelegramWebApp();
  if (webApp) return webApp.initData;
  return getLaunchDataFromHash();
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
