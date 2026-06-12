# Observability

RecipAI uses a thin vendor-agnostic facade (`lib/telemetry/`) so that the rest of the app never imports PostHog, Sentry, or Axiom directly. All three vendors are optional: omit their env keys and they no-op silently.

## Three vendors, three jobs

| Vendor | Job | Env key |
|---|---|---|
| **Sentry** | Error capture + distributed tracing | `NEXT_PUBLIC_SENTRY_DSN` |
| **PostHog Cloud EU** | Product analytics (events + session replay) | `NEXT_PUBLIC_POSTHOG_KEY` |
| **Axiom** | Structured server logs (AI cost, rate limits) | `AXIOM_TOKEN` |

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
| `rate_limit_hit` | `caller_type` (user/anon) |
| `enrich_completed` | `ingredientId` |

On Vercel, Axiom flushes per call (frozen functions can't batch). On the Pi, the client batches normally.
