# Library Map

Task-oriented guide to `lib/` and related source dirs. Answers "which file do I edit to change X?"

---

## AI & parsing

| File | Purpose |
|---|---|
| `lib/ai.ts` | Multi-provider AI client. Tries the Gemini model chain, then OpenAI as last resort. Model names are defined here — this is the source of truth. Exports `callAiForRecipe`, `callAiForRecipePhoto`, `callAiForIngredient`. |
| `lib/parse-recipe/index.ts` | Entry point — routes to `web.ts` or `video.ts` based on URL type. |
| `lib/parse-recipe/web.ts` | Web recipe parsing. Scrape → retain Recipe JSON-LD as reference context → `trimChrome` → AI. |
| `lib/parse-recipe/video.ts` | Social recipe parsing for Instagram, TikTok, YouTube, and X/Twitter. Apify → transcript/media/caption/image context → AI. |
| `lib/parse-recipe/photo.ts` | Client-side image compression and API call for photo parsing. |
| `lib/parse-recipe/prompts.ts` | Prompt builders: `buildWebPrompt`, `buildPhotoPrompt`, `buildSocialPrompt`. |
| `lib/parse-recipe/modifiers.ts` | `PREPARATION_MODIFIERS` curated enum (31 keys) + `modifierLabel`/`modifierPromptList`/`isPreparationModifier`. Source of truth for the additive picker and the parse prompt's key list. |
| `lib/parse-recipe/build-sections.ts` | `buildSectionsFromLabels()` — turns free-form parsed section labels into a `RecipeSection[]` catalog + label→id map, first-appearance order. Shared by save and the legacy-shape migration. |
| `lib/parse-recipe/parsed-recipe-shape.ts` | Shared parsed-label → saved `sections`/`sectionId`/`modifiers[]` mapping used by local and Telegram saves. |
| `lib/parse-recipe/images.ts` | Hero image and step image extraction from HTML. |
| `lib/parse-recipe/parse-history-entry.ts` | Helpers to build `ParseHistoryEntry` from job results. |
| `lib/parse-recipe/friendly-parse-error.ts` | Maps raw errors to user-facing strings. |
| `lib/parse-recipe/normalize-ingredients.ts` | Ingredient normalization: local Fuse.js match → server embed-match batch → provisional creation. |
| `lib/parse-recipe/enrich-ingredient.ts` | Triggers server-side AI enrichment for provisional ingredients. |
| `lib/embed/index.ts` | Server embedding entry point. Parses `EMBED_PROVIDERS`, assembles the ordered local/HTTP chain, and exposes `embed` / `embedLocalOnly`. |
| `lib/embed/chain.ts` | Provider fallback loop and structured success/failure logs. |
| `lib/embed/local-provider.ts` | Lazy in-process e5-small provider used on the Pi. |
| `lib/embed/http-provider.ts` | Remote `/api/embed` provider with shared-secret header and per-host timeout. |
| `lib/db/vocab-vector-search.ts` | Exact pgvector top-two search plus similarity threshold and runner-up-gap decision. |
| `lib/parse-recipe/save-photo-result.ts` | Saves a photo parse result: history entry, Dexie save, image upload. |
| `lib/scrapers/phantomjs.ts` | Primary scraper — JS-rendered HTML via PhantomJsCloud. |
| `lib/scrapers/scrape-do.ts` | Fallback scraper via scrape.do. |
| `lib/scrapers/apify.ts` | Social-content scraper via Apify actors for Instagram, TikTok, YouTube, and X/Twitter. |
| `lib/transcribe/groq.ts` | Groq Whisper transcription for social video/audio when actor transcripts are unavailable. |

---

## Database (local — Dexie)

| File | Purpose |
|---|---|
| `lib/db/db.ts` | Dexie instance + all version migrations (currently v12). |
| `lib/db/schema.ts` | TypeScript types for all Dexie entities. |
| `lib/db/recipes.ts` | CRUD: `createRecipe`, `updateRecipe`, `deleteRecipe`. |
| `lib/db/recipe-sections.ts` | `groupBySectionId` (ingredients — catalog order, coalesced), `groupBySectionRuns` (steps — consecutive runs, order preserved), `sectionName`, `shouldShowSections`. Display-side grouping helpers; see [gotchas](../reference/gotchas.md). |
| `lib/db/migrate-recipe-shape.ts` | `migrateLegacyRecipeShapes()` — one-time-per-recipe upgrade from legacy single-`modifier`/string-`section` to `modifiers[]` + structured `sections`/`sectionId`. Run from `use-sync-on-login.ts`. |
| `lib/db/collections.ts` | CRUD for collections. |
| `lib/db/notifications.ts` | CRUD for sync notifications (`replaceSyncNotifications`, `resolveNotification`). |
| `lib/db/parsed-recipes.ts` | Builds and stores durable parsed-recipe notification rows shared by the parse page and bell sheet. |
| `lib/db/parse-history.ts` | `recordParseHistory`, `bulkPutParseHistory`, `getParseHistory`, `clearParseHistory`. |
| `lib/db/ingredients.ts` | Resolve a raw ingredient against the local vocabulary or create a deduplicated provisional entry. |
| `lib/db/sync-vocab.ts` | Pull confirmed vocabulary deltas into Dexie, with watermark overlap and version-based full refresh. |
| `lib/db/reconcile-vocab.ts` | Guarded one-time cleanup that clears stale local vocabulary rows, re-pulls, and re-normalizes recipes. |
| `lib/db/renormalize-recipes.ts` | Repairs older recipes whose canonical ingredient id array is not index-aligned. |
| `lib/db/normalize-pending-recipes.ts` | `normalizePendingRecipes()` — normalize any local recipe with ingredients but no `canonicalIngredientIds` (e.g. a pulled Telegram bot recipe). Runs on startup and after each sync. |
| `lib/db/pull-own-recipe.ts` | `pullOwnRecipe(id)` — fetch the owner's own recipe from the server into Dexie (with `syncedAt`) when it isn't local yet; used by the recipe-detail deep-link path, then triggers normalization. |
| `lib/db/pantry.ts` | `addPantryItem` (dedups by `ingredientId`, writes dormant `qty`/`unit`/`cat` defaults), `bulkPutPantry`, `clearPantry` and related pantry ops. |
| `lib/db/supabase-sync.ts` | Fire-and-forget sync on writes: `syncCreate`, `syncUpdate`, `syncDelete`. |
| `lib/db/supabase-sync-collections.ts` | Fire-and-forget create/update/delete sync for collections. |
| `lib/db/sync-diff.ts` | Generic diff engine: `computeDiff<T>(local, server)` → server-only / local-only / conflicted / identical buckets. |
| `lib/db/reconcile-plan.ts` | `planReconcile<T>(local, server, opts)` — server-wins planner built on `computeDiff`; returns `{ applyFromServer, pushToServer, deleteLocalIds }` keyed on the `syncedAt` marker. Drives the silent reconciliation in `use-sync-on-login.ts`. |
| `lib/db/save-parsed-recipe.ts` | Maps `ParsedRecipe` → Dexie recipe + triggers background image upload. |

---

## Auth

| File | Purpose |
|---|---|
| `lib/auth/auth.ts` | better-auth server config (Google, Passkey, Telegram OIDC + Mini App, Drizzle adapter). `onAPIError` forwards auth-endpoint failures to Sentry. |
| `lib/auth/telegram-user.ts` | `miniAppDataToUser()` — maps Telegram Mini App data to a user record with a placeholder email (`user.email` is NOT NULL). |
| `lib/auth/auth-error-report.ts` | `shouldReportAuthError()` — decides which better-auth errors reach Sentry (report 500s / raw throws, skip routine 4xx). |
| `lib/telegram/webapp.ts` | SSR-safe wrapper over `window.Telegram.WebApp` — `isTelegramEnvironment()`, `getTelegramWebApp()`, `loadTelegramSdk()`. |
| `lib/telegram/cloud-storage.ts` | Promise wrapper over the Mini App `CloudStorage` (`getCloudItem`/`setCloudItem`, `CLOUD_PREF_KEYS`) — persists prefs across reopens where localStorage/cookies don't. |
| `lib/telegram/launch-locale.ts` | `resolveLaunchLocale()` (stored choice → else Telegram-language seed) + `localeFromTelegramLanguage()` mapping. |
| `components/telegram-locale-sync/` | Launch effect: restores the Mini App locale (redirects if the URL differs); defers to a deep link. |
| `lib/telegram/recipe-card.ts` | The one recipe-card builder — `recipeCardCaption()`, `recipeCardStats()`, `recipeCardButton()`, `telegramPhotoUrl()` — shared by the share flow and the bot's parse-completion message. |
| `lib/telegram/recipe-inline-result.ts` | `buildRecipeInlineResult()` — wraps the card into a share InlineQueryResult (photo or article). |
| `components/telegram-provider/` | Detects the Telegram WebView, runs SDK lifecycle + auto sign-in (`use-auto-sign-in.ts`); exposes `useTelegram()`/`useIsTelegram()`. |
| `components/telegram-back-button/`, `components/telegram-deep-link/` | Native BackButton wiring; `start_param` → route (`resolveStartParamHref`). |
| `lib/auth/auth-client.ts` | Client-side auth client (`authClient.useSession()`, etc.). |
| `lib/auth/require-session.ts` | `requireSession()` — gates API routes, returns `{ session }` or `{ response: 401 }`. |
| `lib/auth/session-state.ts` | Module-level `isSignedIn()` flag — updated by `useSyncOnLogin`, read by `syncFetch`. |
| `lib/auth/external-auth-flow.ts` | PWA device-authorization protocol (request/poll device code) + `establishDeviceSession` cookie exchange. |
| `lib/auth/external-browser.ts` | Get the user out to a real browser — open / copy / share a URL, and full-reload after sign-in. |
| `lib/auth/pending-device-auth.ts` | Persist the pending device auth to `localStorage` so it survives the iOS PWA reload-on-foreground. |
| `lib/auth/external-link-plugin.ts` + `external-link-client.ts` | Server + client for the handoff endpoints (`generate`/`redeem`/`device-session`/`cleanup`). Client `pathMethods` are required. |
| `lib/auth/external-auth-config.ts` | External-auth origin/host helpers, `assertSeparateAuthOrigins`. |

---

## Upload & images

| File | Purpose |
|---|---|
| `lib/upload/imagekit.ts` | ImageKit SDK instance + `uploadImageServer()` (fetches the source image with `imageFetchHeaders`, then uploads). |
| `lib/upload/image-fetch-headers.ts` | `imageFetchHeaders(url)` — browser-like `User-Agent`/`Accept` (+ `instagram.com` `Referer` for cdninstagram/fbcdn) so hotlink-guarded CDNs serve the image instead of a 403. |
| `lib/upload/images.ts` | `isImageKitUrl()` helper (server-side upload path). |
| `lib/imagekit-url.ts` | `getOptimizedUrl()` — builds the direct ImageKit CDN URL (`?tr=w-…`) that `RecipeImage` renders, bypassing `/_next/image`. Also `isImageKitUrl()` + `HERO_IMAGE_WIDTH`. |
| `lib/prewarm-recipe-images.ts` | `prewarmRecipeImages()` — idle-time warms a capped batch of recipe hero images into the SW cache; `prewarmRecipeImage()` warms one on pointer intent. `selectPrewarmUrls()` is its pure core. |
| `lib/schedule-idle.ts` | `scheduleIdle()` — shared `requestIdleCallback`/`setTimeout` fallback wrapper. Used by the image prewarm above and `BottomNav`'s tab-route prefetch. |
| `components/recipe-image/index.tsx` | Renders a recipe image as a plain `<img>` on a direct ImageKit URL (not `next/image`), so the service worker caches it. |
| `lib/upload/upload-auth.ts` | `requireUploadAuth()` — accepts session or upload token. |
| `lib/upload/upload-token.ts` | `mintUploadToken()` / `verifyUploadToken()` via Redis (30 min TTL). |
| `lib/upload/upload-image-source.ts` | Resolves multipart, remote-URL, or base64 upload bodies into one validated source shape. |
| `lib/upload/upload-limits.ts` | Upload size and type constraints. |

---

## Public recipe sharing

| File | Purpose |
|---|---|
| `lib/public-recipes/server.ts` | Fetches public recipe snapshots and sanitizes persisted JSON before rendering. |
| `lib/public-recipes/visibility-client.ts` | Publishes or revokes an owned recipe through the dedicated visibility route. |
| `lib/public-recipes/clone.ts` | Converts a public snapshot into a new private local recipe with fresh row ids. |
| `lib/public-recipes/types.ts` | Public recipe and owner shapes shared by the public page and clone flow. |

---

## Observability / Telemetry

| Task | File |
|---|---|
| Add or change an analytics event | `lib/telemetry/events.ts` |
| Change the telemetry mode (consent gating) | `lib/telemetry/consent.ts` |
| Wire PostHog client (browser SDK) | `lib/telemetry/posthog-client.ts` |
| Wire PostHog server (Node SDK) | `lib/telemetry/posthog-server.ts` |
| Wire Axiom structured logs | `lib/telemetry/axiom.ts` |
| Call an event or log in app code | `lib/telemetry/index.ts` (`trackEvent`, `log`) |

---

## Infrastructure

| File | Purpose |
|---|---|
| `lib/rate-limit.ts` | Redis fixed-window counter plus fail-open parse and embed-match enforcement. |
| `lib/api-limits.ts` | Shared parse/embed rate and request limits plus collection/sync batch sizes. |
| `lib/api-errors.ts` | `ApiError` — typed error responses (`unauthorized`, `badRequest`, `notFound`, `rateLimited`, `internal`, `maintenance`). |
| `lib/redis.ts` | ioredis client singleton (lazy connect). |
| `lib/sync-fetch.ts` | `syncFetch()` — fire-and-forget fetch gated on `isSignedIn()`. Captures unexpected HTTP errors to Sentry; swallows maintenance 503s and transient 502/503/504 blips without reporting. |
| `lib/logger.ts` | `logger.debug/info/warn/error` — prints in dev, silent in production. |
| `proxy.ts` | Next.js middleware (root-level, matches `/api/:path*` + non-API pages). Runs the maintenance-mode gate (`ensureAppAvailable()`) before every `/api/*` request except `/api/auth` and `/api/manifest`, then hands non-API requests to `next-intl`'s locale middleware. |
| `lib/maintenance.ts` | `ensureAppAvailable()` — reads the single-row `app_config` Postgres table; returns a 503 (or fails closed on a DB error) when `maintenance_enabled` is true. |
| `lib/maintenance-constants.ts` | Client-safe constants shared between the server gate and browser code: `MAINTENANCE_MODE_CODE`, `DEFAULT_MAINTENANCE_MESSAGE`. |
| `lib/api/api-fetch.ts` | `apiFetch()` / `announceIfMaintenance()` / `maintenanceErrorFromResponse()` — client-side detection of a maintenance 503, dispatches a `window` event so `MaintenanceListener` can toast the message anywhere. |

---

## Navigation & routing

| File | Purpose |
|---|---|
| `lib/routes.ts` | Shared UI and app-client route/API URL constants. Use these at feature call sites; framework and internal-only endpoints are not all exported. |
| `lib/transitions.ts` | `useNavigate()` — wraps `router.push` and the navigation stack. |
| `lib/navigation-stack.tsx` | Navigation stack context (iOS-style page overlays). |

---

## Misc

| File | Purpose |
|---|---|
| `lib/video-url.ts` | `isSocialUrl()`, `getSocialPlatform()`, `isInstagramUrl()` — social URL type detection. |
| `lib/pwa.ts` | Installed-PWA and iOS environment detection. |
| `lib/telegram-bot.ts` | `sendTelegramMessage()`, `sendTelegramPhoto()`, `miniAppDeepLink()`, `savePreparedInlineMessage()`, `extractUrl()`. |
| `lib/web-push.ts` | `sendPushNotification()` via VAPID (`web-push`). No-op when VAPID env vars are missing. |
| `lib/parse-job-storage.ts` | localStorage tracking of in-flight parse job ids and their upload tokens. |
| `lib/parse-job-completion.ts` | Race-free guard so only one poller (inline page vs global watcher) runs a parse job's completion side effects. |
| `lib/parse-job-events.ts` | Browser events that hand completed parse-job rows from the global watcher back to the parse page. |
| `lib/units.ts` | `MEASUREMENT_UNITS` (canonical code → `en`/`ua` label) + `unitLabel()` / `toMeasurementUnit()`. Display-only localization of the stored unit code, with an alias table covering en/ua/ru spelling variants. |
| `lib/categories.ts` | Recipe category constants. |
| `lib/category-styles.ts` | Category badge colors (`getCategoryStyle()`) — single source of truth. |
| `lib/utils.ts` | `generateId()` and other small utilities. |
| `lib/theme.ts` | Theme helpers. |
| `lib/recipes-prefetch.ts` | Prefetch helpers for recipe lists. |
| `lib/greeting.ts` | Time-based greeting strings. |

---

## Hooks

| File | Purpose |
|---|---|
| `hooks/use-sync-on-login.ts` | Owns single-flight reconciliation on sign-in, foreground return, and manual refresh: diffs recipes/collections and syncs ingredients, pantry, and parse history. Mounted app-lifetime via `lib/sync-context.tsx`, not per-page. |
| `lib/sync-context.tsx` | `SyncProvider` (mounts `useSyncOnLogin` once in `ClientShell`) + `useTriggerSync()` (pull-to-refresh consumes this, not the hook directly). |
| `hooks/use-parse-job-watcher.ts` | Polls a parse job until done/failed, records history, and creates parsed-recipe bell entries for background completions. |
| `hooks/` (rest) | UI hooks: long press, pull to refresh, recipe filter/matcher, recipes page state, live-query transition. |
| `lib/hooks/` | PWA install/push, telemetry identity, public vocabulary sync, startup normalization, and URL-parse hooks. |

---

## Drizzle / Postgres

| File | Purpose |
|---|---|
| `db/schema/recipes.ts` | Recipes table schema. |
| `db/schema/collections.ts` | Collections table schema. |
| `db/schema/parse-jobs.ts` | Parse jobs table schema. |
| `db/schema/ingredients.ts` | Vocabulary ingredients table schema. |
| `db/schema/pantry.ts` | Pantry table schema. |
| `db/schema/auth.ts` | better-auth tables (do not edit manually). |
| `db/migrations/` | Drizzle migration files. |
| `drizzle.config.ts` | Drizzle config. |
