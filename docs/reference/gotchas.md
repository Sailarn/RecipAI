# Gotchas

Non-obvious behaviours and hard-won lessons. If something acts weird, check here first.

---

## Database

**Supabase dates are strings.**
JSON from Supabase (`fetch` responses, `useSyncOnLogin`) has `createdAt`/`updatedAt` as ISO strings. Dexie expects `Date` objects. Always convert: `createdAt: new Date(row.createdAt)`. The `parseTimestamps` helper in `hooks/use-sync-on-login.ts` does this for recipes and collections.

**The reverse also bites: client snapshots → Drizzle.**
When a client sends a record back to an API route (e.g. sync-review "keep mine" PATCHes the full recipe snapshot), every date field is an ISO **string**. Drizzle's `timestamp` columns call `.toISOString()` on the value, so a string crashes the write with `TypeError: a.toISOString is not a function`. Revive **all** date fields to `Date` before `db.update(...).set(...)` / `.insert(...)`, not just the obvious `updatedAt`. See `app/api/recipes/[id]/route.ts` (PATCH) and the `recipes-sync` upsert.

**Dexie `put` is an upsert.**
`db.table.put(item)` inserts or replaces by primary key — it does not merge partial updates. Pass the full object or use `update` for partial changes.

**Vocab delta-sync can strand a stale row (timezone-naive watermark).**
`pullVocab` (`lib/db/sync-vocab.ts`) stores the max `updatedAt` it has seen in `localStorage["ingredientsSyncedAt"]` and re-pulls with `?since=<watermark>` → `gt(ingredients.updatedAt, since)`. Because `ingredients.updated_at` is `timestamp without time zone`, the `Date → toISOString() → new Date()` round-trip can drift by sub-second precision (or hours, if a non-UTC server writes it) and the strict `>` then **skips the boundary row**, which stays stale locally forever — the classic symptom is one ingredient that never picks up its translation until a full reset. Two guards mitigate it: the pull **overlaps** the watermark by `WATERMARK_OVERLAP_MS` (60s) so the boundary is always re-fetched, and a **change in `NEXT_PUBLIC_APP_VERSION` forces a full re-pull** (the version is tracked in `localStorage["ingredientsSyncedVersion"]`). The root cause was fixed by migrating the columns to `timestamptz` (migration `0016`); the two client guards remain as defense-in-depth. `bulkPut` is an idempotent upsert, so re-fetching the overlap is free.

**RLS is disabled on all tables — currently safe, but a latent footgun.**
Row-Level Security is off on all 11 Postgres tables (no policies), yet the data is **not** exposed via the public anon key. Reachability needs **two** gates open: a table `GRANT` to the `anon`/`authenticated` role **and** RLS. Here the `anon`/`authenticated` roles have **zero grants** on these Drizzle-created tables, so PostgREST (`https://<ref>.supabase.co/rest/v1/...`) returns *permission denied* — that's why the Supabase security advisor is clean. The app never uses the anon key anyway: it connects directly via `DATABASE_URL` as the `postgres` role (`db/index.ts`), which **owns** the tables and so bypasses RLS regardless. The risk appears the moment you **grant `anon`/`authenticated` access** — exactly what adopting `supabase-js` or toggling the Supabase "Data API" does — because RLS-off then means every row is publicly readable/writable. Before going that route, enable RLS and write per-user policies. Enabling RLS as deny-all today is safe (the app bypasses as owner; `relforcerowsecurity` is off) and makes the tables fail-closed against a future accidental grant.

**The parse result cache keys on a *normalized* URL, and can't store an ephemeral image.**
`POST /api/parse-queue` serves a prior parse for the same URL by matching `parse_jobs.normalized_url` (`normalizeSourceUrl`) + the current `PARSER_VERSION`. Three non-obvious rules: (1) **URL normalization must canonicalize Instagram** — `/reel/X`, `/reels/X`, `/p/X`, `/tv/X` are the same media, so they collapse to `instagram.com/reel/X`; without this, `/reels/` misses the `/reel/` cache and re-parses. (2) **Incomplete parses are failed, not cached** — both ingredients and instructions must be non-empty, and the lookup enforces the same condition so a failed extraction cannot poison the cache. (3) **The image is uploaded to ImageKit at parse time**, not at save time, because the stored `result.imageUrl` is what a *cached* hit serves and source CDN URLs (Instagram's especially) expire within hours. Bump `PARSER_VERSION` to invalidate the whole cache after a prompt/model change; to heal individual stale-image rows, clear their `parser_version` so they re-parse fresh on next import.

---

## Testing

**Use `bun run test`, not `bun test`.**
`bun test` is Bun's native runner and breaks Vitest globals. Always use `bun run test` (which runs Vitest).

**`toHaveStyle` cannot see Tailwind classes.**
`toHaveStyle` reads inline `style` attributes only. If you convert an inline style to a Tailwind class, switch the test assertion to a semantic attribute (`data-active`, `aria-*`) instead.

**`vi.mock` factory hoisting.**
Constants referenced inside a `vi.mock()` factory must be declared with `vi.hoisted(() => ...)` if they are defined outside the factory. Otherwise the factory runs before the constant is initialised.

**Mock `useNavigate` with all three methods.**
Always include `{ push: vi.fn(), back: vi.fn(), replace: vi.fn() }` — omitting `replace` breaks tests for any component that calls `navigate.replace()`.

---

## Navigation

**`navigate.back()` not `navigate.replace()` to close stack views.**
Stack-pushed views (recipe detail, edit, create) must close with `navigate.back()`. Using `navigate.replace()` only changes the URL — the stack overlay stays visible until an async effect fires, causing a stutter.

**Never hardcode route strings.**
Always import from `lib/routes.ts`. Bare strings like `"/recipes"` miss the locale prefix — `routes.recipes.list(locale)` yields `/<locale>/recipes`.

**`useNavigate()` returns a fresh object every render.**
`lib/transitions.ts` builds a new object literal on each call, so anything that lists `navigate` (or a callback closing over it) in a dependency array re-runs on *every* re-render. This bit `use-parse-job-watcher`: its polling effect re-ran on every re-render and re-polled all saved job IDs, spawning a *second* concurrent poll loop for an in-flight job — both reached `done` and fired `handleDone` twice (two toasts + two `parsedRecipes` rows). Fix pattern: make the work idempotent per key (a `useRef<Set>` guard), don't rely on the effect running exactly once.

---

## Styles

**`border-none` suppresses single-side borders.**
In Tailwind v4, `border-none` sets `border-style: none` which overrides any `border-t`/`border-b` width on the same element. For a single-side border, use `border-t-2` alone — preflight's `border: 0 solid` default makes it render correctly.

---

## Animation

**`leftMv.set()` doesn't cancel running animations.**
Always call `animCtrl.current?.stop()` before `leftMv.set()`, otherwise a running `animate()` overrides the snap on the next frame.

**Nav pill spring guard.**
The spring effect in `components/bottom-nav/use-bottom-nav.ts` is guarded by `if (shouldHide) return`. Do not remove it — without it the pill drifts to the wrong position while the nav is hidden.

---

## API routes

**Never swallow Promise rejections.**
If you `.catch()` to set error state, always re-throw so Sentry's `unhandledrejection` handler captures the real error:
```ts
.catch((caughtError) => {
  setError(true);
  throw caughtError;
})
```

**Use `ApiError` for all client error responses.**
Never hand-roll `NextResponse.json({ error }, { status })`. Use `ApiError.unauthorized()`, `ApiError.badRequest(msg)`, `ApiError.notFound()`, `ApiError.rateLimited()`, and `ApiError.internal(error, req)` in catch blocks.

---

## Observability

**`parse_pipeline` only logs *successful* completions — and historically logged `success: true` on empty results.**
The `parse_pipeline` Axiom log fires after a recipe is accepted, so it is not the place to look for failures. Before the completeness guard (`requireCompleteRecipe`), a 0-ingredient / 0-instruction extraction still reached this log as `success: true` (real example in Axiom: an `instagram.com` parse with `ingredient_count=0`, `step_count=0`). The guard now rejects those before the success log, so going forward `parse_pipeline` means a genuinely complete parse.

**Failed extractions are logged as `parse_incomplete`, not in Sentry.**
Every rejected parse emits a `parse_incomplete` Axiom log (server-side, consent-independent) with `source`, `reason` (`not_recipe` / `no_ingredients` / `no_instructions`), `url`, `jobId`, and the full partial `result` the model returned. A failed job never persists its `result`, so this log is the **only** record of what the model produced — query it to deep-dive a single bad parse, not just count them. Volume is low (single-operator app), so treat it as a forensic trail, not a trend dashboard.

---

## Overflow detection

**Use `getBoundingClientRect`, not `scrollHeight`.**
`scrollHeight` is inflated under `overflow: hidden`. Compare `getBoundingClientRect` heights to detect actual overflow. See `components/recipe-form/use-scroll-overflow.ts`.

---

## PWA / Build

**Production builds must use webpack.**
`bun run build` (which passes `--webpack`) is required for `@serwist/next`. The default Turbopack dev server is fine for local development but will not produce a valid service worker.

**`public/sw.js` is regenerated on every build.**
It is gitignored. Do not commit it. Running `bun run build` will always overwrite it.

**Env-dependent clients must not throw at module scope — `next build` evaluates them.**
Next's page-data collection imports route modules during the production build, so any client instantiated at module top-level runs with the build environment, which often lacks runtime secrets. A bare `throw new Error("X is required")` or `new Client(process.env.X!)` at module scope will fail the build. Two safe patterns are already in use — match one when adding a new client:
- **Lazy proxy** — defer construction (and the env check) to first property access. See `lib/redis.ts`: importing it never instantiates Redis; `REDIS_URL` is only required on the first actual call at request time.
- **Empty-string fallback** — `process.env.X ?? ""` so the constructor never throws at import; the call fails later with a real error if the value is genuinely missing. See `db/index.ts` (`postgres(process.env.DATABASE_URL ?? "")`) and `lib/upload/imagekit.ts`.

Never read a required secret with `!` or an unguarded `throw` at module scope.

**The iOS status-bar scrim depends on `viewport-fit=cover`, which is inherited — not set on the app's own viewport.**
Sonner notifications can repaint the Dynamic Island / notch area while they animate. In standalone mode, `StatusBarScrim` (gated by `@media (display-mode: standalone)`) owns that strip in `var(--background)` at a very high `z-index`, and the mobile toaster starts below it (`--mobile-toast-offset: calc(env(safe-area-inset-top) + 16px)`). All of that relies on `env(safe-area-inset-top)` being non-zero, which requires `viewport-fit=cover`. **Cover is declared only in `public/pwa-launch.html`** (the PWA `start_url`) and inherited by the standalone session — it is deliberately *not* on the app's Next `viewport` export, because setting it there introduced a persistent bottom gap. So the scrim works on the cold-launch-through-splash path; if a future WebKit stops persisting viewport-fit across the in-session navigation, the scrim height (and every `env(safe-area-inset-top)` padding) collapses to zero.

All **bottom** spacing is fixed, never `env(safe-area-inset-bottom)`: the bottom nav uses `var(--bottom-nav-offset)` (32px), and sheets use fixed `pb-*`. This is intentional — adding bottom insets reintroduced an unwanted gap. Pull-to-refresh must attach only after its asynchronously rendered scroll container mounts, and its indicator carries `env(safe-area-inset-top)` padding so the scrim doesn't cover the label.

**The push-notification toggle is hidden in dev — that's expected.**
`usePushSubscription` only reports `isSupported: true` once `navigator.serviceWorker.ready` resolves *and* the context is secure (`window.isSecureContext`) *and* the three Push APIs exist *and* `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is set. Because the Turbopack dev server registers no service worker, `.ready` never resolves, so the row stays hidden (gating only on `"PushManager" in window` would show a toggle that hangs on click). To test push locally, run a production build (`bun run build && bun run start`) on `localhost`, or use an HTTPS tunnel (ngrok) / the Vercel deploy. On the Pi over plain `http://recipai.local` push is unavailable — service workers require a secure context. The toggle lives in its own component (`app/[locale]/profile/components/push-notification-toggle/`) which reads `push.isSupported`; do not re-derive a separate detection in the page.

**Web Push platform support — especially iOS — is restrictive, and that's not a bug.**
The toggle is correctly absent in contexts that genuinely cannot deliver push:

| Platform / context | Web Push? |
|---|---|
| Desktop Chrome / Firefox / Edge (HTTPS) | ✅ Yes |
| macOS Safari 16.1+ | ✅ Yes |
| Android Chrome / Firefox (HTTPS) | ✅ Yes |
| **iOS/iPadOS Safari — browser tab** | ❌ No |
| **iOS Chrome / Firefox / Edge (any tab)** | ❌ No (all use WebKit; push isn't exposed) |
| **iOS/iPadOS — installed PWA (Add to Home Screen, 16.4+)** | ✅ Yes |
| Any non-secure origin (e.g. `http://`) | ❌ No |

The key iOS rule (since iOS 16.4, March 2023): **Web Push works *only* in a web app installed to the Home Screen**, never in a Safari/Chrome browser tab. There is no API or library that can enable in-tab notifications on iOS — the only path for an iOS user is "Add to Home Screen" first. So an iOS user browsing in Safari sees no notifications row at all; they must install the PWA to get it.

**`notificationclick` must focus *any* open window, not match the URL exactly.**
In `app/sw.ts`, matching an existing client by `client.url === targetUrl` almost never holds — the open PWA sits at e.g. `/en/recipes` while the notification target is a recipe URL — so it falls through to `clients.openWindow()`, which on a standalone iOS/Android PWA opens the **default browser** instead of the installed app. Focus the first open app window and `client.navigate(targetUrl)` it; only `openWindow` when nothing is open. (If the PWA is fully closed at tap time, iOS WebKit can still route `openWindow` to Safari — that edge case is not fixable from the SW.)

**The cold-start splash uses two different mechanisms — don't unify them.**
The iOS WKWebView white flash happens *before first paint* and cannot be fixed with CSS or a React component (both render too late). So the splash is split by context:
- **Installed PWA** → `public/pwa-launch.html` is the manifest `start_url`. It is a zero-CSS static shell that paints `#0a0a0a` instantly; WebKit holds it visible until the real app's first paint, then it JS-redirects. It is intentionally excluded from the middleware matcher (`.html` extension), so it is served as-is.
- **Browser tab** → the `LaunchSplash` React component (mounted in `app/[locale]/layout.tsx`). It runs a before-paint effect that no-ops when `display-mode: standalone` (i.e. inside the PWA, where `pwa-launch.html` already handled it).

Theme changes reload to re-trigger the splash: `ThemeToggle` calls `location.replace('/pwa-launch.html?from=…')` in the PWA, but a plain `location.reload()` in the browser (so the component path fires). `pwa-launch.html` validates `?from=` is a single-leading-slash same-origin path before redirecting — it is a public file, so an unvalidated `from` would be an open redirect.
