# API Routes

All routes live under `app/api/`. These routes are the server-sync layer — parsing, local save, and browsing all work without a session. `requireSession()` gates routes that read from or write to Postgres on behalf of the signed-in user; upload routes use `requireUploadAuth()` (session OR short-lived upload token minted at parse-job creation).

---

## Parse queue

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/parse-queue` | Rate-limited (anon: 15/hr, user: 60/hr) | Create a parse job. Returns `{ jobId, uploadToken }`. |
| `GET` | `/api/parse-queue` | Session required | List the signed-in user's parse jobs. |
| `GET` | `/api/parse-queue/[id]` | None | Poll a job's status and result. |
| `POST` | `/api/parse-queue/process` | None (internal) | Process a queued job. Idempotent — skips if job is `done` or `processing` within 90 s. `maxDuration: 60`. |
| `POST` | `/api/parse-queue/claim` | Session required | Adopt anonymous jobs (by id array) into the signed-in user's account. Used on login to link pre-login history. |

**Rate limiting** is enforced on the `POST /api/parse-queue` and `POST /api/parse-recipe/photo` routes via `enforceParseRateLimit()` from `lib/rate-limit.ts`. The limit is shared across both endpoints per caller (IP for anonymous, user id for signed-in). Fails open if Redis is unreachable.

---

## Photo parse

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/parse-recipe/photo` | Rate-limited (session optional) | Parse a recipe from a base64-encoded image. Body: `{ imageBase64, mimeType, userComment? }`. |

---

## Recipes

These routes back the Postgres copy of local data. Session is only needed to sync; local (IndexedDB) operations bypass them entirely.

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/recipes` | Session required | Create a recipe in Postgres. |
| `PATCH` | `/api/recipes/[id]` | Session required | Update a recipe (partial). Scoped to the signed-in user. |
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
| `POST` | `/api/images/upload` | Session or upload token | Upload an image to ImageKit. Accepts URL or base64. Returns `{ url, fileId }`. |
| `DELETE` | `/api/images/delete` | Session or upload token | Delete an image from ImageKit by `fileId`. |

---

## Ingredients

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/ingredients` | None (public) | Fetch confirmed vocabulary ingredients, including each entry's `embedding`. Supports `?since=<ISO>` for delta sync. |
| `POST` | `/api/ingredients` | Session required | Create a provisional vocabulary entry (`{ id, en, ua?, category? }`). Conflict-safe (`onConflictDoNothing`). |
| `POST` | `/api/ingredients/enrich` | Session required | Enrich a provisional ingredient via AI (fills `en`, `ua`, `category`, aliases). |
| `PATCH` | `/api/ingredients/[id]` | Session required | Contribute the on-device `embedding` for an entry (`{ embedding: number[384] }`). Write-once — only sets the column when it is still null. |

For anonymous users the `POST` routes are skipped client-side — provisional entries stay in local Dexie only. See [Local storage & sync](../explanation/local-storage-and-sync.md#ingredient-vocabulary-stays-local-for-anonymous-users).

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

The server sends a push notification via VAPID when a parse job completes (`POST /api/parse-queue/process`). The client passes its subscription endpoint when creating a job, but at completion a **signed-in** job is delivered to *all* of the user's current subscriptions — resolved by `userId` at send time, so a device that subscribed after (or instead of) the enqueue-time endpoint still gets the push. Anonymous jobs fall back to the single enqueue-time endpoint. Expired endpoints (`404`/`410`) are pruned per send.

---

## Auth

| Route | Description |
|---|---|
| `/api/auth/[...all]` | better-auth catch-all handler. Manages sessions, OAuth callbacks, passkey registration, Telegram OIDC. |

---

## Telegram bot

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/telegram-bot` | Webhook secret (optional) | Receives Telegram messages. Extracts URLs and enqueues parse jobs linked to the user's Telegram account. |

The webhook secret (`TELEGRAM_WEBHOOK_SECRET`) is verified if set; if not set the route accepts all requests. Only one instance should own the webhook.

---

## PWA manifest

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/manifest` | None (public) | Serves the web app manifest (`application/manifest+json`, `Cache-Control: no-cache`). `start_url` is `/pwa-launch.html` — a zero-CSS static shell that paints dark instantly and JS-redirects to the real app, giving PWA cold launches a native-feeling dark splash instead of a white flash. Referenced from root `app/layout.tsx` metadata. |
