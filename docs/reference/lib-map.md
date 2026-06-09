# Library Map

Task-oriented guide to `lib/` and related source dirs. Answers "which file do I edit to change X?"

---

## AI & parsing

| File | Purpose |
|---|---|
| `lib/ai.ts` | Multi-provider AI client. Tries the Gemini model chain, then OpenAI as last resort. Model names are defined here — this is the source of truth. Exports `callAiForRecipe`, `callAiForRecipePhoto`, `callAiForIngredient`. |
| `lib/parse-recipe/index.ts` | Entry point — routes to `web.ts` or `video.ts` based on URL type. |
| `lib/parse-recipe/web.ts` | Web recipe parsing. Schema.org short-circuit → `trimChrome` → AI fallback. |
| `lib/parse-recipe/video.ts` | Instagram Reel parsing. Apify → Groq Whisper → AI. |
| `lib/parse-recipe/photo.ts` | Client-side image compression and API call for photo parsing. |
| `lib/parse-recipe/prompts.ts` | Prompt builders: `buildWebPrompt`, `buildPhotoPrompt`, `buildTranscriptPrompt`. |
| `lib/parse-recipe/images.ts` | Hero image and step image extraction from HTML. |
| `lib/parse-recipe/parse-history-entry.ts` | Helpers to build `ParseHistoryEntry` from job results. |
| `lib/parse-recipe/friendly-parse-error.ts` | Maps raw errors to user-facing strings. |
| `lib/parse-recipe/normalize-ingredients.ts` | Ingredient normalization logic (Fuse.js + vocabulary matching). |
| `lib/parse-recipe/enrich-ingredient.ts` | Triggers server-side AI enrichment for provisional ingredients. |
| `lib/scrapers/phantomjs.ts` | Primary scraper — JS-rendered HTML via PhantomJsCloud. |
| `lib/scrapers/scrape-do.ts` | Fallback scraper via scrape.do. |
| `lib/scrapers/apify.ts` | Instagram Reel downloader via Apify. |
| `lib/transcribe/groq.ts` | Groq Whisper transcription for video audio. |

---

## Database (local — Dexie)

| File | Purpose |
|---|---|
| `lib/db/db.ts` | Dexie instance + all version migrations (currently v11). |
| `lib/db/schema.ts` | TypeScript types for all Dexie entities. |
| `lib/db/recipes.ts` | CRUD: `createRecipe`, `updateRecipe`, `deleteRecipe`. |
| `lib/db/collections.ts` | CRUD for collections. |
| `lib/db/notifications.ts` | CRUD for sync notifications (`replaceSyncNotifications`, `resolveNotification`). |
| `lib/db/parse-history.ts` | `recordParseHistory`, `bulkPutParseHistory`, `getParseHistory`, `clearParseHistory`. |
| `lib/db/pantry.ts` | `bulkPutPantry`, `clearPantry` and related pantry ops. |
| `lib/db/supabase-sync.ts` | Fire-and-forget sync on writes: `syncCreate`, `syncUpdate`, `syncDelete`. |
| `lib/db/sync-diff.ts` | Generic diff engine: `computeDiff<T>(local, server)`. |
| `lib/db/save-parsed-recipe.ts` | Maps `ParsedRecipe` → Dexie recipe + triggers background image upload. |

---

## Auth

| File | Purpose |
|---|---|
| `lib/auth/auth.ts` | better-auth server config (Google, Passkey, Telegram OIDC, Drizzle adapter). |
| `lib/auth/auth-client.ts` | Client-side auth client (`authClient.useSession()`, etc.). |
| `lib/auth/require-session.ts` | `requireSession()` — gates API routes, returns `{ session }` or `{ response: 401 }`. |
| `lib/auth/session-state.ts` | Module-level `isSignedIn()` flag — updated by `useSyncOnLogin`, read by `syncFetch`. |

---

## Upload & images

| File | Purpose |
|---|---|
| `lib/upload/imagekit.ts` | ImageKit SDK instance + `uploadImageServer()`. |
| `lib/upload/images.ts` | `isImageKitUrl()` helper. |
| `lib/upload/upload-auth.ts` | `requireUploadAuth()` — accepts session or upload token. |
| `lib/upload/upload-token.ts` | `mintUploadToken()` / `verifyUploadToken()` via Redis (30 min TTL). |
| `lib/upload/upload-image-source.ts` | Resolves upload body — URL or base64. |
| `lib/upload/upload-limits.ts` | Upload size and type constraints. |

---

## Infrastructure

| File | Purpose |
|---|---|
| `lib/rate-limit.ts` | `enforceParseRateLimit()` — Redis fixed-window counter, fail-open. |
| `lib/api-limits.ts` | Shared limit constants: `PARSE_RATE_LIMIT` (15 anon / 60 user per hour), collection/sync batch sizes. |
| `lib/api-errors.ts` | `ApiError` — typed error responses (`unauthorized`, `badRequest`, `notFound`, `rateLimited`, `internal`). |
| `lib/redis.ts` | ioredis client singleton (lazy connect). |
| `lib/sync-fetch.ts` | `syncFetch()` — fire-and-forget fetch gated on `isSignedIn()`, captures HTTP errors to Sentry. |
| `lib/logger.ts` | `logger.debug/info/warn/error` — prints in dev, silent in production. |

---

## Navigation & routing

| File | Purpose |
|---|---|
| `lib/routes.ts` | All route and API URL constants. Always import from here — never hardcode strings. |
| `lib/transitions.ts` | `useNavigate()` — wraps `router.push` and the navigation stack. |
| `lib/navigation-stack.tsx` | Navigation stack context (iOS-style page overlays). |

---

## Misc

| File | Purpose |
|---|---|
| `lib/video-url.ts` | `isVideoUrl()`, `isInstagramUrl()` — URL type detection. |
| `lib/telegram-bot.ts` | `sendTelegramMessage()`, `extractUrl()`. |
| `lib/categories.ts` | Recipe category constants. |
| `lib/utils.ts` | `generateId()` and other small utilities. |
| `lib/theme.ts` | Theme helpers. |
| `lib/recipes-prefetch.ts` | Prefetch helpers for recipe lists. |
| `lib/greeting.ts` | Time-based greeting strings. |

---

## Hooks

| File | Purpose |
|---|---|
| `hooks/use-sync-on-login.ts` | Runs on session change — diffs recipes/collections, syncs ingredients, pantry, and parse history. |
| `hooks/use-parse-job-watcher.ts` | Polls a parse job until done/failed, records history, shows toast. |
| `lib/hooks/` | Shared UI hooks (scroll overflow, long press, etc.). |

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
