# API Routes

All routes live under `app/api/`. These routes are the server-sync layer — parsing, local save, and browsing all work without a session. `requireSession()` gates routes that read from or write to Postgres on behalf of the signed-in user; upload routes use `requireUploadAuth()` (session OR short-lived upload token minted at parse-job creation).

---

## Maintenance mode

`proxy.ts` (Next.js middleware) gates every `/api/*` request except `/api/auth/*` and `/api/manifest` behind a DB-backed kill switch, before any route handler runs. `ensureAppAvailable()` (`lib/maintenance.ts`) reads the single-row `app_config` Postgres table (see [data model](data-model.md#app_config)); if `maintenance_enabled` is true — or if that read itself throws — the request is short-circuited with `503 { error, code: "MAINTENANCE_MODE" }` and a `Retry-After: 30` header. This **fails closed** (a DB outage looks like maintenance to every caller), the opposite of the rate limiter below, which fails open on a Redis outage.

The client detects this via `maintenanceErrorFromResponse` (`lib/api/api-fetch.ts`) — `status === 503` and `body.code === MAINTENANCE_MODE_CODE` — and surfaces the server-supplied message as a toast (`MaintenanceListener`). `syncFetch` swallows it without reporting to Sentry (see [gotchas](gotchas.md)). Toggle via the Supabase dashboard directly — no admin UI yet.

---

## Parse queue

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/parse-queue` | Rate-limited (anon: 15/hr, user: 60/hr) | Create a parse job. Body `{ url, pushEndpoint?, telegramNotify? }`. Returns `{ jobId, uploadToken }`. On a **cache hit** (same normalized URL already parsed by the current `PARSER_VERSION`) the job is inserted already `done` with the cloned result and the response also carries `{ cached: true, result }`. When `telegramNotify` is set and the signed-in user has a linked Telegram account, the job is stamped with their `telegramChatId` and the response echoes `{ telegramNotify: true }` — see the Telegram-notify hand-off below. |
| `GET` | `/api/parse-queue` | Session required | List the signed-in user's parse jobs. |
| `GET` | `/api/parse-queue/[id]` | None | Poll a job's status and result. |
| `POST` | `/api/parse-queue/process` | None (internal) | Process a queued job. Idempotent — skips if job is `done` or `processing` within 90 s. `maxDuration: 60`. |
| `POST` | `/api/parse-queue/claim` | Session required | Adopt anonymous jobs (by id array) into the signed-in user's account. Used on login to link pre-login history. |

**Rate limiting** is enforced on the `POST /api/parse-queue` and `POST /api/parse-recipe/photo` routes via `enforceParseRateLimit()` from `lib/rate-limit.ts`. The limit is shared across both endpoints per caller (IP for anonymous, user id for signed-in). Fails open if Redis is unreachable.

---

## Photo parse

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/parse-recipe/photo` | Rate-limited (session optional) | Parse a recipe from a base64-encoded image. Body: `{ imageBase64, mimeType, jobId? }`. The current client supplies `jobId` so the synchronous photo result is recorded in `parse_jobs` under the same ID as local history; omitted IDs are generated server-side for compatibility with older clients. |

---

## Recipes

These routes back the Postgres copy of local data. Session is only needed to sync; local (IndexedDB) operations bypass them entirely.

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/recipes` | Session required | Create a recipe in Postgres. |
| `GET` | `/api/recipes/[id]` | Session required | Fetch one of the owner's own recipes (any visibility) as `{ recipe }`; `404` if not theirs. Lets a device pull a recipe not yet in local Dexie — e.g. a Telegram bot deep link opened before the full sync. Public sharing uses the isPublic-only page fetch, not this. |
| `PATCH` | `/api/recipes/[id]` | Session required | Update a recipe (partial). Scoped to the signed-in user. |
| `PUT` | `/api/recipes/[id]/visibility` | Session required | Publish the current owned recipe snapshot or synchronously revoke public access. Normal create/update/sync routes cannot change visibility. |
| `DELETE` | `/api/recipes/[id]` | Session required | Delete a recipe. Scoped to the signed-in user. |
| `POST` | `/api/recipes/sync` | Session required | Bulk-upsert recipes from the client (max 200). Used by `useSyncOnLogin`. |
| `GET` | `/api/recipes/sync` | Session required | Pull all of the user's recipes from Postgres. |

---

## Collections

These routes back the Postgres copy of local data. Session is only needed to sync; local (IndexedDB) operations bypass them entirely.

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/collections` | Session required | List the user's collections. |
| `POST` | `/api/collections` | Session required | Create a collection. |
| `PATCH` | `/api/collections/[id]` | Session required | Update a collection. |
| `DELETE` | `/api/collections/[id]` | Session required | Delete a collection. |
| `POST` | `/api/collections/sync` | Session required | Bulk-upsert collections (max 200). |

---

## Images

Both routes accept either a valid session **or** a short-lived upload token (minted by `POST /api/parse-queue` and stored in Redis for 30 minutes).

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/images/upload` | Session or upload token | Upload an image to ImageKit. Accepts multipart file data or JSON containing a remote `url` or base64 `file`; the 10 MB cap applies to every source. Multipart and fetched images must be JPEG, PNG, WebP, or GIF. Returns `{ url, fileId }`. |
| `DELETE` | `/api/images/delete` | Session or upload token | Delete an image from ImageKit by `fileId`. |

---

## Ingredients

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/ingredients` | None (public) | Fetch confirmed vocabulary names, aliases, categories, and statuses. Vectors are server-only and omitted. Supports `?since=<ISO>` for delta sync. |
| `POST` | `/api/ingredients` | Session required | Create a provisional vocabulary entry (`{ id, en, ua?, category? }`). Conflict-safe (`onConflictDoNothing`). |
| `POST` | `/api/ingredients/embed-match` | Rate-limited public | Batch-match `{ items: [{ item, en?, ua? }] }` through the embedding provider chain and pgvector. Returns `{ matches, degraded }`; provider exhaustion is HTTP 200 with null matches and `degraded: true`. |
| `POST` | `/api/ingredients/enrich` | Session required | Enrich and confirm a provisional ingredient via AI, then best-effort compute its server-side `passage:` vector. Embedding failure leaves a detectable null vector without blocking enrichment. |
| `POST` | `/api/embed` | `x-embed-secret` | Raw e5-small compute endpoint used between embedding hosts. Accepts `{ texts, prefix? }` and returns `{ vectors }`; it does not query or store application data. |

For anonymous users, the client skips provisional persistence and enrichment (`POST /api/ingredients` and `/api/ingredients/enrich`), so new entries stay in local Dexie. The public embed-match route remains available. See [Local storage & sync](../explanation/local-storage-and-sync.md#ingredient-vocabulary-stays-local-for-anonymous-users).

The public embed-match route accepts 1–64 items with strings up to 200 characters and is limited to 120 requests/minute per anonymous IP or 600 requests/minute per signed-in user. Like parse limiting, it fails open if Redis is unavailable. The shared-secret `/api/embed` endpoint uses the same batch and text bounds but is not publicly rate-limited.

---

## Pantry

These routes back the Postgres copy of local data. Session is only needed to sync; local (IndexedDB) operations bypass them entirely.

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/pantry` | Session required | Fetch the user's pantry items with resolved ingredient names. |
| `POST` | `/api/pantry` | Session required | Upsert one pantry item. Updates the existing `(user, ingredient)` row in place if present (no duplicate), inserts otherwise. Upserts the ingredient first when `ingredientData` is supplied, to avoid FK violations. |
| `DELETE` | `/api/pantry` | Session required | Delete a pantry item by id. |

---

## Web Push

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/push/subscribe` | None (session optional) | Upsert a push subscription (`{ endpoint, keys: { p256dh, auth } }`). If a session is present the subscription is linked to the user. |
| `DELETE` | `/api/push/subscribe` | None | Remove a push subscription by `{ endpoint }`. |

The server sends a push notification via VAPID when a parse job finishes (`POST /api/parse-queue/process`): success sends "recipe ready", and failure sends a parse-failed notification. The client passes its subscription endpoint when creating a job, but at completion a **signed-in** job is delivered to *all* of the user's current subscriptions — resolved by `userId` at send time, so a device that subscribed after (or instead of) the enqueue-time endpoint still gets the push. Anonymous jobs fall back to the single enqueue-time endpoint. Expired endpoints (`404`/`410`) are pruned per send.

**Telegram-notify hand-off.** Web push is dead inside the Telegram WebView (service workers are unregistered on launch), so a parse started **inside** the Mini App would otherwise finish silently. When the client sends `telegramNotify: true` (Mini App, or a web user with a linked Telegram account and the "Telegram notifications" toggle on — `lib/hooks/use-telegram-notify.ts`), `POST /api/parse-queue` resolves the user's chat id (`resolveTelegramChatId`) and stamps the job's `telegramChatId`. That makes an in-app parse take the **same completion path as the bot flow**: `process` saves the recipe server-side (`saveParsedRecipeForUser`) and sends the "saved" bot message with the deep-link button — no in-app review step. The client (`use-url-parse`) sees the echoed `telegramNotify: true` and skips its review/save/watcher/`process` path, but still **polls in "notify mode"** purely to surface the terminal state in-app — the "parsing in background" banner, then a success toast or the failure error (so a failed parse isn't silent in-app). A cache hit is saved server-side inline in the enqueue route; a cache miss kicks `process` off server-side so completion + notification happen even if the client navigates away. If the user has no resolvable Telegram connection the response is `{ telegramNotify: false }` and the client falls back to the normal review flow.

`sendTelegramMessage` (`lib/telegram-bot.ts`) checks the Telegram API response and reports a non-2xx (bad chat id, HTML parse error, rate limit) to Sentry instead of swallowing it — a dropped completion notification is otherwise invisible.

---

## Auth

`/api/auth/[...all]` is the better-auth catch-all (sessions, OAuth callbacks, passkey, Telegram OIDC). Notable plugin routes used by the PWA external-browser sign-in and linking flows:

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/device/code` | Client id | Start a device-authorization grant for PWA Google sign-in. |
| `GET` | `/api/auth/device` | None | Verify a `user_code`'s status. |
| `POST` | `/api/auth/device/approve`, `/device/deny` | Session | Approve/deny a device code (run in the user's real browser). |
| `POST` | `/api/auth/device/token` | None | Poll the grant; once approved returns a session token (no cookie). |
| `POST` | `/api/auth/external-link/device-session` | Token | Exchange the device session token for a real session cookie. |
| `POST` | `/api/auth/external-link/generate` | Session | Issue a one-time account-link handoff token. |
| `POST` | `/api/auth/external-link/redeem` | None | Redeem the handoff token → temporary session cookie. |
| `POST` | `/api/auth/external-link/cleanup` | Session | Delete the temporary linking session. |

See [Auth & Sync](../explanation/auth-and-sync.md) for the full flows. Custom client calls **must** declare their method in the client plugin's `pathMethods` — a body-less call otherwise defaults to GET and POST-only routes 404 (see gotchas).

---

## Telegram bot

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/telegram-bot` | Webhook secret (optional) | Receives Telegram messages. Extracts URLs and enqueues parse jobs linked to the user's Telegram account. |
| `POST` | `/api/telegram/share-recipe` | Session | Body `{ recipeId }`. For a **public** recipe, mints a prepared inline message (Bot API `savePreparedInlineMessage`) and returns `{ preparedMessageId }` for the Mini App's `WebApp.shareMessage`. See [Telegram Mini App](../explanation/telegram-mini-app.md). |

The webhook secret (`TELEGRAM_WEBHOOK_SECRET`) is verified if set; if not set the route accepts all requests. Only one instance should own the webhook. On parse completion the bot sends the **unified recipe card** (`lib/telegram/recipe-card.ts`) — a native photo card (`sendTelegramPhoto`) with a `✅ Saved to RecipAI` header and a `🍳 Open recipe` button deep-linking (`startapp=recipe_<id>`) into the Mini App, the same card the share flow sends.

---

## PWA manifest

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/manifest` | None (public) | Serves the web app manifest (`application/manifest+json`, `Cache-Control: no-cache`). `start_url` is `/pwa-launch.html` — a zero-CSS static shell that paints dark instantly and JS-redirects to the real app, giving PWA cold launches a native-feeling dark splash instead of a white flash. Referenced from root `app/layout.tsx` metadata. |
