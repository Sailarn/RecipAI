# Telegram Mini App

RecipAI runs inside Telegram as a [Mini App](https://core.telegram.org/bots/webapps) —
the same Next.js bundle, loaded in Telegram's in-app WebView. There is no separate build or
deployment; the app detects the Telegram environment at runtime and adapts.

The Mini App complements the Telegram **bot** (`/api/telegram-bot`): the bot handles quick
"send a link in chat → parse" imports, while the Mini App is the full browse/manage/cook surface.

## How it launches

Telegram opens the app URL directly in a WebView (not an iframe on native clients, so cookies
are first-party) and injects the SDK plus a signed `initData` payload. Entry points: the bot's
menu button, inline/keyboard buttons, or a direct link `t.me/<bot>/<appname>` (optionally with
`?startapp=…`).

## Environment detection & lifecycle

`lib/telegram/webapp.ts` is an SSR-safe wrapper over `window.Telegram.WebApp`. Everything no-ops
outside Telegram, so callers need no `typeof window` guards.

- `isTelegramEnvironment()` — true from the SDK, or from the `tgWebAppData` launch hash before
  the SDK script loads.
- `getTelegramWebApp()` — the live instance (requires non-empty `initData`).
- `loadTelegramSdk()` — lazily injects `telegram-web-app.js`.

`components/telegram-provider` mounts above `ClientShell`. On launch it calls `ready()` +
`expand()`, matches Telegram's header/background to the app's dark `#0a0a0a` (no white flash —
the app keeps its own amber/dark theme rather than adopting `themeParams`), calls
`disableVerticalSwipes()` (so scrolling doesn't close the app), tags `<html>` with `.telegram`,
**unregisters service workers** (Serwist caching is unreliable in the WebView; Dexie/IndexedDB
is unaffected and remains the local store), and fires `telegram_mini_app_launched`. It exposes
`useTelegram()` / `useIsTelegram()`.

## Auth — silent sign-in

Auth is handled by the `better-auth-telegram` plugin's Mini App path (enabled in
`lib/auth/auth.ts`). On launch, `useTelegramAutoSignIn` calls
`authClient.signInWithMiniApp(initData)`; the server validates the payload (HMAC-SHA256 with the
bot token, `auth_date` freshness) and issues a session. It then refreshes the better-auth session
store so [`useSyncOnLogin`](auth-and-sync.md) reconciles — no reload. The web
Google/Passkey/device-authorization flows are not used in the WebView.

### One identity across web and Telegram

A web **OIDC** login (`providerId "telegram-oidc"`) and a Mini App **sign-in**
(`providerId "telegram"`) must resolve to one user. The Mini App path looks up an existing user
by `user.telegramId` before creating one, so `oidc.mapOIDCProfileToUser` stamps
`telegramId = claims.id` onto OIDC users. **Use the id_token's `id` claim, not `sub`** —
Telegram's `sub` is an opaque pairwise identifier that does *not* equal the Mini App's `initData`
user id; only `id` (the real numeric Telegram id, e.g. `316693380`) matches. The bot webhook
matches **both** providers (by `accountId` for Mini App accounts, by the id-token `id` claim for
OIDC).

!!! note "Legacy backfill"
    A user who signed in via OIDC **before** `mapOIDCProfileToUser` was added has
    `user.telegram_id = null` and would be duplicated on first Mini App launch. Backfill it once
    (a gitignored `scripts/local/` dry-run script the user runs), e.g. set `user.telegram_id`
    from the matching `telegram-oidc` account's `accountId`.

## Navigation

- `components/telegram-back-button` drives Telegram's native **BackButton** from the navigation
  stack: shown when a view is pushed over the root, popping it via `navigate.back()`.
- `components/telegram-deep-link` maps the launch `start_param` to a destination once —
  `pantry`, `parse`, `profile`, or `recipe_<id>`. It reads the param **synchronously** from the launch
  hash via `getLaunchStartParam()` (not the async SDK `webApp`), so it acts before the first paint.
  A `recipe_<id>` is **pushed onto the navigation stack** over the recipes list (the launch page — the
  home route redirects there), so closing it pops back to the list with the slide animation; a bare
  `navigate.replace` left nothing underneath and lost the transition. Non-recipe params are tab roots,
  so they `replace`. Trade-off: the recipes list is now intentionally behind the detail (the previous
  `replace` avoided a ~1s list flash, but also killed the stack effect). **Owned-recipe scope:** the
  pushed `<RecipeDetail recipeId>` has no server-fetched `publicRecipe`, so a genuinely cross-user
  *public* share resolves via the signed-in owner-pull (or the private guard) rather than the shared
  view — acceptable for the single-user deployment.
- **One recipe card, two surfaces.** `lib/telegram/recipe-card.ts` is the single builder for the
  Telegram recipe card — caption (title + category + `time · servings · ingredients`), the
  `🍳 Open recipe` deep-link button, and the JPEG photo transform. Both the **share** flow
  (`recipe-inline-result.ts` → prepared inline message) and the **bot's parse-completion** message
  (`/api/parse-queue/process` → `sendTelegramPhoto`, a native photo card with a `✅ Saved to RecipAI`
  header) render from it, so a recipient sees one consistent card. The caption is deliberately compact
  — no description — because a long multi-line title plus a description made the pre-send share sheet
  tall enough to push its controls off-screen; the button carries the rest.

## What changes inside Telegram

| Web / PWA | Inside Telegram |
|---|---|
| Google / Passkey / device-auth login | Silent `initData` sign-in; login card shows status only |
| PWA install prompt | Native "Add to Home Screen" via `webApp.addToHomeScreen()` |
| Web push toggle | Hidden — parse alerts arrive via the bot chat |
| Web Share API / copy | Native share sheet — a rich recipe **card** via `shareMessage` (prepared inline message), falling back to `t.me/share/url` |
| No haptics (iOS blocks web vibration) | Native haptics on card tap, tab change, pantry/tried toggle, save/delete (`platform.haptics`) |
| Service worker offline cache | Unregistered (Dexie still works) |
| Launch splash | Skipped (Telegram shows its own) |
| Theme preference | Persisted to **CloudStorage** (localStorage is cleared between sessions) and restored on launch |

## Preference persistence

The WebView clears `localStorage` and cookies between app reopens (recipes survive only because
`useSyncOnLogin` re-pulls them from the server), so the theme cookie/localStorage and the
`NEXT_LOCALE` cookie don't stick. User preferences are therefore mirrored to **Telegram
CloudStorage** (`lib/telegram/cloud-storage.ts` — a promise wrapper over the SDK's error-first
`CloudStorage`, keyed by `CLOUD_PREF_KEYS`), which persists per-user across reopens and devices.

- **Theme:** `ThemeToggle` writes the choice to CloudStorage alongside localStorage/cookie;
  `TelegramProvider` reads it back on launch (`restoreThemeFromCloud`) and flips the `<html>` class.
  The synchronous pre-paint script still reads localStorage first (no flash when it survives); the
  CloudStorage restore is async, so a brief default-theme flash is possible when it doesn't.
- **Locale:** the locale lives in the URL path, so a reopen lands on the middleware default. The
  profile language toggle writes the choice to CloudStorage; `TelegramLocaleSync` (in `ClientShell`)
  resolves the intended locale on launch (`resolveLaunchLocale`: stored choice → else a seed from the
  Telegram UI language) and redirects if the launch URL differs. It waits for the SDK (CloudStorage +
  `language_code` need it) and **defers to a deep link** — when a `start_param` is present, the deep
  link owns the destination and its locale, so the locale sync skips to avoid a competing navigation.
- **Telegram-language seed** (`localeFromTelegramLanguage`): with no stored choice, `uk`→`ua`,
  `en`→`en`, `ru`→`ua`, anything else→`en` (Telegram uses ISO `uk`; the app locale is `ua`). The seed
  is recomputed each launch and never stored, so it tracks the Telegram language until the user picks
  one — only an explicit choice is written to CloudStorage and it always wins.

## Setup (BotFather / ops)

1. In @BotFather, create the Mini App (`/newapp` or Menu Button → Web App) pointing at the prod
   origin; note the `t.me/<bot>/<appname>` link and set the menu button to open it.
2. No new env vars — `TELEGRAM_BOT_TOKEN` (already set) is the initData validation secret.
3. Prod must be HTTPS with a valid cert.

Local testing: `bun run tunnel` (ngrok) → point a **test** bot's Mini App URL at the tunnel
(Telegram requires HTTPS). Note that Telegram **Web** (`web.telegram.org`) loads Mini Apps in an
iframe, so verify cookie behaviour there separately.
