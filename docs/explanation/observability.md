# Observability

RecipAI uses a thin vendor-agnostic facade (`lib/telemetry/`) so that the rest of the app never imports PostHog, Sentry, or Axiom directly. All three vendors are optional: omit their env keys and they no-op silently.

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
- Unhandled server errors via `ApiError.capture` / `ApiError.internal`, client errors via the re-throw pattern (`captureError`).
- 20% performance trace sampling (`tracesSampleRate`).
- Production only (`NODE_ENV === "production"`).

### PostHog — product analytics
- **Autocapture:** pageviews (`$pageview`, SPA-aware), `$pageleave` (time on page), click autocapture, **session replay** (inputs masked).
- **Identity:** `identifyUser` on login attaches `email` / `name` / `image` (when the provider supplies them) and `locale`; `resetIdentity` on logout.
- **Named events** (the full taxonomy lives in `lib/telemetry/events.ts`): auth (`login`, `logout`, `account_linked`), the parse funnel (`parse_started` with `source`+`domain`, `parse_succeeded`, `parse_failed`, `parse_reviewed`, `recipe_saved`, `ingredients_normalized`), recipe lifecycle (`recipe_viewed`, `recipe_deleted`, `recipe_tried_toggled`, `step_images_viewed`, `servings_adjusted`), engagement (`search_performed`, `filter_applied`, collections, pantry, `theme_changed`, `language_changed`), and lifecycle signals (`embed_*`, `push_subscribed`, `pwa_installed`, `parse_history_viewed`, `sync_review_resolved`).
- This is where you build "top parsed domains," the parse conversion funnel, retention, and DAU/WAU. Insights are computed retroactively over stored events, so they can be built at any time without losing prior data.

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

**Exception:** `instrumentation-client.ts` imports `initPostHogClient` from `lib/telemetry/posthog-client` directly. This is the one sanctioned internal import — PostHog must be initialized before the first event fires, which happens at page load before any user interaction.

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
| `parse_pipeline` | `source` (url/photo), `domain`, `path` (schema/ai), `scraper` (phantomjs/scrape-do), `scrape_ms`, `total_ms`, `ingredient_count`, `step_count`, `success` |
| `rate_limit_hit` | `caller_type` (user/anon) |
| `enrich_completed` | `ingredientId` |

`parse_pipeline` is logged once per successful parse (in `lib/parse-recipe/web.ts` for URLs, the photo route for photos). It answers the operational questions PostHog can't: schema-vs-AI ratio, scraper fallback rate, per-step latency (`scrape_ms` / `total_ms`; AI time is in `ai_call`), and which domains are slow or need AI. `domain` is the hostname only — never the full URL, which can carry tokens.

On Vercel, Axiom flushes per call (frozen functions can't batch). On the Pi, the client batches normally. The client's `onError` routes ingest failures to the dev/server logger so a bad token or dataset isn't silently dropped.
