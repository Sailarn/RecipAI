# Observability

RecipAI uses a thin vendor-agnostic facade (`lib/telemetry/`) for product events, structured logs, identity, and most manual error capture. The PostHog and Axiom integrations live under `lib/telemetry/`, with PostHog initialized from `instrumentation-client.ts`. Sentry also has framework-required entry points (`next.config.ts`, `instrumentation.ts`, `instrumentation-client.ts`, the Sentry config files, and `app/global-error.tsx`); `lib/sync-fetch.ts` imports it directly to report unexpected sync status codes. All three vendors are optional: omit their env keys and they no-op silently.

**Production only.** PostHog and Axiom initialize only when `NODE_ENV === "production"`, so local development and tests never send data — even with the keys present in `.env.local`. The gate lives at each vendor's SDK boundary (`initPostHogClient`, the PostHog-node `getClient`, and Axiom's `getClient`) via `lib/telemetry/environment.ts`, mirroring the `NODE_ENV` check in the Sentry config files.

To verify the pipeline locally without a production build, set the escape-hatch vars in `.env.local`: `TELEMETRY_DEV=1` (server-side: Axiom, PostHog-node) and/or `NEXT_PUBLIC_TELEMETRY_DEV=1` (client-side: PostHog browser SDK). Restart the dev server after changing them — `NEXT_PUBLIC_*` vars are inlined at startup, and server modules don't always hot-reload. Leave both unset for normal local work.

## Three vendors, three jobs

| Vendor | Job | Env key |
|---|---|---|
| **Sentry** | Error capture + distributed tracing | `NEXT_PUBLIC_SENTRY_DSN` |
| **PostHog Cloud EU** | Product analytics (events + session replay) | `NEXT_PUBLIC_POSTHOG_KEY` |
| **Axiom** | Structured server logs (AI cost, pipeline perf) | `AXIOM_TOKEN` |

## What each tool captures

The routing rule: **PostHog** answers *what/who* — top-N lists, funnels, trends sliced by user or time (product questions). **Axiom** answers *how/how-long/how-much* — per-event server detail with numeric fields, queried for performance, cost, and debugging (operational questions). **Sentry** answers *what broke*.

### Sentry — errors & tracing
- Request instrumentation via `onRequestError`, route errors via `ApiError.capture` / `ApiError.internal`, the root client error boundary, and handled exceptions explicitly passed to `captureError`.
- **Auth endpoints** (`/api/auth/*`) are served by better-auth's own handler, so they bypass `ApiError`. `auth.onAPIError.onError` forwards their failures to `captureError` (tag `source: "better-auth"`), filtered by `shouldReportAuthError` (`lib/auth/auth-error-report.ts`) so routine 4xx — denied logins, rate limits — don't flood Sentry while genuine 500s do. This was a blind spot: a new Mini App user failing to insert (NOT NULL email) left the user stuck with **no** Sentry event.
- **Client best-effort paths that swallow to stay offline-tolerant** still report genuine failures when `navigator.onLine`: the sync reconciliation catch (`use-sync-on-login`, tag `sync-on-login`) and the parse-job watcher (`use-parse-job-watcher`, tag `parse-job-watcher`) — so a reconcile bug or a completed parse that fails to save locally is visible instead of silently lost.
- `syncFetch` reports non-transient, non-maintenance HTTP failures directly; expected offline errors and 502/503/504 availability blips remain silent.
- 20% performance trace sampling (`tracesSampleRate`).
- Production only (`NODE_ENV === "production"`).
- `ignoreErrors` (`instrumentation-client.ts`) filters non-actionable noise from `@serwist/next`'s auto-injected service-worker registration (`"Rejected"`, `reading 'waiting'`), which only fails for crawlers/headless browsers that never run a service worker. Separately, `syncFetch` (`lib/sync-fetch.ts`) never reports maintenance 503s or transient 502/503/504 upstream blips — see [Auth & Sync](auth-and-sync.md#fire-and-forget-sync-on-writes-libdbsupabase-syncts).

### PostHog — product analytics
- **Autocapture:** pageviews (`$pageview`, SPA-aware), `$pageleave` (time on page), click autocapture, **session replay** (inputs masked).
- **Identity:** `identifyUser` on login attaches `email` / `name` / `image` (when the provider supplies them) and `locale`; `resetIdentity` on logout.
- **Named events** (the full taxonomy lives in `lib/telemetry/events.ts`): auth (`login`, `logout`, `account_linked`), the parse funnel (`parse_started` with `source`+`domain`, `parse_succeeded`, `parse_failed`, `parse_reviewed`, `recipe_saved`, `ingredients_normalized`), recipe lifecycle (`recipe_viewed`, `recipe_deleted`, `recipe_tried_toggled`, `step_images_viewed`, `servings_adjusted`), engagement (`search_performed`, `filter_applied`, collections, pantry, `theme_changed`, `language_changed`), and lifecycle signals (`embed_match`, `push_subscribed`, `push_unsubscribed`, `pwa_installed`, `parse_history_viewed`, `sync_review_resolved`).
- This is where you build "top parsed domains," the parse conversion funnel, retention, and DAU/WAU. Insights are computed retroactively over stored events, so they can be built at any time without losing prior data.

### Build identity — `build_id`

Every event carries the build it came from. `lib/build-id.ts` reads `NEXT_PUBLIC_BUILD_ID`, resolved once in `next.config.ts` (`resolveBuildId`: Vercel commit SHA → `git rev-parse` → package version, [never a clock](../reference/gotchas.md)) and inlined at build time.

| Surface | How it is attached |
|---|---|
| PostHog browser | `posthog.register({ build_id })` at init — a super-property on every subsequent event |
| PostHog node | Merged into `properties` per event; posthog-node has no super-property equivalent |
| Sentry (all three runtimes) | `initialScope.tags.build_id` |
| Profile screen | Shown next to the version as `v2.26.0 · abc1234`, so a support question pins the exact deploy |

It is a Sentry **tag**, deliberately not `release`: `withSentryConfig` detects its own release name and uploads source maps under it, so overriding `release` with our truncated id would orphan those maps and leave every stack trace minified.

Why it earns its place: the package version only moves on a release, which cannot distinguish "running the current deploy" from "pinned to old cached code by a stale service-worker cache". With `build_id`, events arriving with an id that is no longer the deployed one *are* the symptom — one filter instead of an investigation. That is the signal that was missing when an Android user's recipes silently failed to load; see the service-worker entry in [Gotchas](../reference/gotchas.md).

### App delivery — is the client running the code we shipped?

Two events, both fired from `instrumentation-client.ts` at idle via `lib/pwa/build-freshness.ts`:

| Event | Meaning |
|---|---|
| `stale_document_detected` | The bundle's `build_id` disagrees with `/api/build`. The document came from a previous deploy. Carries `document_build_id` and `server_build_id`. |
| `sw_controller_changed` | A service worker took control of an already-open page. `skipWaiting` + `clientsClaim` swap the worker under live tabs on deploy, leaving the page running the old build's JS against the new build's caches — the shape of "it broke, then fixed itself", which a reload repairs without a trace. |

On detecting staleness the client calls `registration.update()` rather than forcing a reload: the new worker's install precaches the current build and its activate sweeps older page caches, so the next navigation is clean — without yanking the page out from under someone mid-edit, and without risking a reload loop against a rolling deploy that is still serving both builds.

Versioning the page cache should make `stale_document_detected` unreachable, so it is a regression alarm rather than routine traffic. A cluster of them on one device means the cache fix has a hole; a scatter across devices at one timestamp is just a mid-session deploy.

### Axiom — server logs
See [Server logs in Axiom](#server-logs-in-axiom) below for the structured-record table (AI cost, rate limits, and the parse-pipeline performance record).

## The facade

`lib/telemetry/index.ts` is the **only** file the rest of the app may import. Five functions:

| Function | What it does |
|---|---|
| `trackEvent(name, properties?)` | Fire a product analytics event. Client → PostHog JS; server → PostHog Node. |
| `identifyUser(userId, personProperties?)` | Link future events to a known user. Client-only. |
| `resetIdentity()` | Unlink on logout. Client-only. |
| `captureError(error, context?)` | Send an exception to Sentry with optional tags/extra. |
| `log(level, message, fields?)` | Dev console + server → Axiom (when `AXIOM_TOKEN` is set). |

**Never-throw guarantee.** Every function wraps its work in `safely()` — a sync/async error swallow. A vendor outage costs data, never a render or a request.

`instrumentation-client.ts` imports `initPostHogClient` from `lib/telemetry/posthog-client` directly so PostHog initializes before the first page-load event. The Sentry integration points named above are the other intentional vendor imports; ordinary feature code should use the facade.

## Events

All event names and property shapes live in `lib/telemetry/events.ts`. Adding an event means adding an entry there — inline event-name strings at call sites are forbidden.

`signup` has no reliable client-side trigger (better-auth doesn't flag "newly created" in the social redirect flow). PostHog's person first-seen date covers acquisition until a server-side hook is added.

## How to add an event

1. Add an entry to `TelemetryEvents` in `lib/telemetry/events.ts`.
2. Call `trackEvent("my_event", { ...props })` in the handler that owns the user's decision. Never call it in render bodies.
3. Add a key-flow assertion in the relevant test file.

## PostHog proxy

Events are sent to `/ingest/...` (a Next.js rewrite in `next.config.ts`) which forwards to `eu.i.posthog.com`. This bypasses adblockers without requiring a separate proxy service.

## Session replay

PostHog session replay is on with `maskAllInputs: true`. Replay is initialized at page load via `instrumentation-client.ts` so the recording starts from the first user interaction.

## Server logs in Axiom

`log()` calls on the server emit structured JSON rows to the `recipai` dataset (configurable via `AXIOM_DATASET`). Current instrumented signals:

| Message | Fields |
|---|---|
| `ai_call` | `model`, `context` (recipe/ingredient/photo), `duration_ms`, `success`, `fallback_index` |
| `parse_pipeline` | Common: `source` (url/photo), `path` (always `ai`), `total_ms`, counts, `success`. Web parses also include `domain`, `scraper`, and `scrape_ms`. |
| `parse_incomplete` | `source` (page/social/photo), `reason`, source `url` when available, optional `jobId`; under-extractions also include title, counts, and the partial `result` |
| `social_parse_pipeline` | `source` (social), `platform`, `path` (actor_transcript/media_transcription/caption_image), `duration_seconds`, `has_caption`, `has_transcript`, `has_video`, `image_count`, `ingredient_count`, `step_count`, `total_ms`, `success` |
| `social_parse_failed` | `platform`, `url`, `reason` (duration_limit/media_too_large/unsupported_platform/restricted/not_found/no_content/unexpected), `duration_seconds`, `total_ms`, `error_message` |
| `rate_limit_hit` | `caller_type` (user/anon) |
| `embed_provider_served` / `embed_provider_failed` | `provider`, fallback `depth`, `ms`; success adds `count`, failure adds `error` |
| `embed_match_served` / `embed_match_degraded` | `count`, `ms`; success also includes `matched` |
| `embed_raw_served` | `count`, `ms` |
| `ingredient_created` | `ingredientId`, `userId` |
| `enrich_merged` | `provisionalId`, `canonicalId`, `userId` |
| `enrich_completed` | `ingredientId`, `userId` |
| `enrich_embed_skipped` / `enrich_embed_persist_failed` | `ingredientId` |

`parse_pipeline` is logged once per successful web/photo parse (in `lib/parse-recipe/web.ts` for URLs, the photo route for photos). `parse_incomplete` records every rejected AI extraction, including social results, before the error propagates. `social_parse_pipeline` is the successful social record, and `social_parse_failed` classifies the outer platform/transcription failure. These records answer the operational questions PostHog can't: scraper fallback rate, social platform/path mix, per-step latency (`scrape_ms` / `total_ms`; AI time is in `ai_call`), and which domains/platforms are slow or need AI. `domain` is the hostname only for web parses; social logs include the source URL because social URLs are the reproducible media key.

The embedding records separate provider fallback health from matcher outcomes: `embed_provider_*` describes each host attempt, `embed_match_*` describes the public pgvector request, and `embed_raw_served` describes successful shared-secret model-host requests. Ingredient lifecycle records make provisional creation, canonical merging, confirmation, and best-effort vector gaps queryable.

On Vercel, Axiom flushes per call (frozen functions can't batch). On the Pi, the client batches normally. The client's `onError` routes ingest failures to the dev/server logger so a bad token or dataset isn't silently dropped.
