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
Row-Level Security is off on all 13 Postgres tables (no policies), yet the data is **not** exposed via the public anon key. Reachability needs **two** gates open: a table `GRANT` to the `anon`/`authenticated` role **and** RLS. Here the `anon`/`authenticated` roles have **zero grants** on these Drizzle-created tables, so PostgREST (`https://<ref>.supabase.co/rest/v1/...`) returns *permission denied* — that's why the Supabase security advisor is clean. The app never uses the anon key anyway: it connects directly via `DATABASE_URL` as the `postgres` role (`db/index.ts`), which **owns** the tables and so bypasses RLS regardless. The risk appears the moment you **grant `anon`/`authenticated` access** — exactly what adopting `supabase-js` or toggling the Supabase "Data API" does — because RLS-off then means every row is publicly readable/writable. Before going that route, enable RLS and write per-user policies. Enabling RLS as deny-all today is safe (the app bypasses as owner; `relforcerowsecurity` is off) and makes the tables fail-closed against a future accidental grant.

**The parse result cache keys on a *normalized* URL, and can't store an ephemeral image.**
`POST /api/parse-queue` serves a prior parse for the same URL by matching `parse_jobs.normalized_url` (`normalizeSourceUrl`) + the current `PARSER_VERSION`. Three non-obvious rules: (1) **URL normalization must canonicalize Instagram** — `/reel/X`, `/reels/X`, `/p/X`, `/tv/X` are the same media, so they collapse to `instagram.com/reel/X`; without this, `/reels/` misses the `/reel/` cache and re-parses. (2) **Incomplete parses are failed, not cached** — both ingredients and instructions must be non-empty, and the lookup enforces the same condition so a failed extraction cannot poison the cache. (3) **The image is uploaded to ImageKit at parse time**, not at save time, because the stored `result.imageUrl` is what a *cached* hit serves and source CDN URLs (Instagram's especially) expire within hours. Bump `PARSER_VERSION` to invalidate the whole cache after a prompt/model change; to heal individual stale-image rows, clear their `parser_version` so they re-parse fresh on next import.

**pgvector `<=>` is cosine distance, not similarity.**
The nearest-vocabulary query converts it with `similarity = 1 - distance`. Do not compare the raw `<=>` result to the similarity threshold. The server fetches the top two confirmed neighbors and accepts the best only when its similarity is at least `0.88` and it leads the runner-up by at least `0.02`. These were calibrated for `multilingual-e5-small` from a labeled probe sweep (`scripts/local/admin/calibrate`): same-language correct matches cluster ≥0.89 while generic queries top out at ~0.875, so `0.88` separates them. The earlier `0.82`/`0.08` pair was carried over from a different on-device model — its `0.08` gap rejected most correct matches that had a close sibling (e.g. `tomato` vs `tomato-cherry`). At the current vocabulary size this is an exact scan; add an HNSW/IVFFlat index only after measuring a larger dataset.

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

**Main tabs still use `router.push`, not the navigation stack, and are now statically rendered.**
`bottom-nav/index.tsx` intentionally does *not* pass a React element to `navigate.push()` for Recipes/Import/Profile — see `lib/transitions.ts:13-14`, which falls through to `router.push()` for those. This is a real Next.js navigation (unlike Pantry/detail, which push an element into `lib/navigation-stack.tsx`'s in-memory stack). As of the locale-layout staticization below, that navigation resolves against a pre-rendered static shell rather than a per-request server render, and `BottomNav` idle-prefetches the other two tabs' RSC payloads on mount (`router.prefetch`, deduped, re-fired on `onPointerDown` as a fast-path) — see `lib/schedule-idle.ts`. This is a *different* cache from `prefetchRecipesPage`'s Dexie warm-up (also on the Recipes tab's `onPointerDown`); both fire independently.

**The `[locale]` layout is statically rendered — do not reintroduce a per-request read there.**
`app/[locale]/layout.tsx` used to call `cookies()` to pick the theme, which made every route under `[locale]` request-time rendered (`ƒ`) even though almost every page is a pure client component with no server data needs. It now has `generateStaticParams()` (both locales) and calls `setRequestLocale(locale)` before `getMessages()` (required by `next-intl`'s static-rendering path — omitting it silently falls back to per-request header detection and the route goes dynamic again with no error). This took Recipes, Import, Profile, Pantry, ParseHistory, Login, SyncReview, and `recipes/new` from `ƒ` to `●` (SSG) — confirm with `bun run build`, don't infer it from the diff. `recipes/[id]` and its `edit` route stay `ƒ` on their own (unrelated server data), which is correct and expected.

Theme is now resolved **client-side before first paint**, not server-side: the `<html>` class and its background CSS are a static `dark` default (`THEME.DARK` in `app/[locale]/layout.tsx`), and a synchronous inline `<script>` (no `src`/`async`/`type="module"` — must stay strictly synchronous) flips to `.light` by reading `localStorage.getItem("theme")` before the browser paints. `ThemeToggle` already wrote to `localStorage` *and* a cookie on every change (`components/theme-toggle/index.tsx`) — the cookie write was kept even though the layout no longer reads it, in case something else needs it later; the localStorage side is now load-bearing. `suppressHydrationWarning` on `<html>`/`<body>` was already present and is required for this pattern (React must not treat the script's class swap as a hydration mismatch).

---

## Styles

**`border-none` suppresses single-side borders.**
In Tailwind v4, `border-none` sets `border-style: none` which overrides any `border-t`/`border-b` width on the same element. For a single-side border, use `border-t-2` alone — preflight's `border: 0 solid` default makes it render correctly.

**Every text `<input>`/`<textarea>` must compute to `font-size: 16px` (`text-base`) or larger.**
iOS Safari auto-zooms the viewport on focus for any native form control (`input`, `textarea`, `select`) with a computed font-size under 16px — a real, recurring bug, not a one-off (found independently in the search bar, the shared `Textarea` component, and an inline section-name editor). The shared `Input`/`Textarea` components (`components/ui/`) already default to `--text-base`; if you add a new raw `<input>`/`<textarea>` (or override one of those two with a `style` prop), it must stay at `text-base` or above — never `text-sm`/`text-xs`/`text-[Npx]` under 16 on a focusable field. Radix's `Select` is exempt: `Select.Trigger` renders a `<button role="combobox">`, not a native `<select>`, so it isn't subject to this at all regardless of font size.

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

**Embedding-provider failure is a normal degraded match, not a route error.**
When every configured embedding host fails, `POST /api/ingredients/embed-match` returns HTTP 200 with `{ matches: [null, ...], degraded: true }`. The client then creates provisional ingredients as usual. Do not turn this into a 500 or hide the gap: provisional rows, confirmed rows with a null vector, and empty canonical-id slots are intentionally queryable so a later repair tool can find them.

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

## Auth (PWA external-browser sign-in & linking)

**`/device/token` returns a bearer token, not a cookie.**
The device-authorization grant creates a session row and returns its token as `access_token` with no `Set-Cookie`. The PWA must exchange it via `POST /external-link/device-session` (`establishDeviceSession`) for a real session cookie, then do a full-page reload. A soft client-side nav keeps the stale signed-out session atom and lands on the login card even though the user is "signed in" server-side.

**better-auth client plugins need `pathMethods`.**
The client proxy infers the HTTP method from the request *body*; a no-argument call (`externalLink.generate()`, `cleanup()`) has no body, defaults to **GET**, and POST-only routes return **404**. Declare every route's method in the client plugin (`lib/auth/external-link-client.ts`). This silently broke PWA linking until fixed.

**Account linking requires app origin ≠ external-auth origin.**
The linking handoff sets a temporary session cookie on the external origin; if that equals the app origin and the cookie jar is shared (Android installed-PWA ↔ Chrome) it clobbers the real session, and the cleanup delete then signs the user out. `assertSeparateAuthOrigins` enforces this for linking (not sign-in). So linking works on `recipai.pp.ua` but not when the app is served from the external-auth origin itself.

**Duplicate accounts can't be merged through the UI.**
Telegram OIDC uses a synthetic `<id>@telegram.oidc` email that never matches Google's, so signing in with the second provider standalone forks a new user; `linkSocial` can only attach an *unowned* provider, not merge two owned identities. Resolution is a manual DB merge (move user-scoped rows, delete the dupe — all FKs to `user` are `ON DELETE CASCADE`). A self-service in-app merge is tracked on the board.

**iOS PWA reloads when it returns to the foreground.**
Coming back from the system browser wipes in-memory state, so the pending device authorization is persisted to `localStorage` (`lib/auth/pending-device-auth.ts`) and polling resumes on mount. `window.open` also can't escape the in-app browser on iOS — the Share sheet is the only reliable way out, so it's the primary action there.

---

## Recipe ingredients & steps

**Parsed ingredient amounts are always metric — units are converted at parse time, not stored as-is.**
`lib/parse-recipe/prompts.ts`'s `METRIC_UNITS_RULE` instructs the AI to convert any imperial/US customary unit in the source (cups, oz, lb, fl oz, pints, quarts, gallons) to grams or milliliters before output — weight/volume units convert by a fixed factor, but cups/tbsp/tsp used for a *solid* (flour, sugar, butter, etc.) require an ingredient-density estimate, which is left to the model's own knowledge rather than a hardcoded table (there's no practical way to hardcode every ingredient's density). There is no schema-level enforcement (`unit` is a free `string` throughout `lib/db/schema.ts`, and the AI call has no Zod/JSON-schema validation) — the prompt text is the only lever. `tsp`/`tbsp` are intentionally still allowed output units (common in European/Ukrainian recipes too, not considered "imperial" for this rule); only cup/oz/lb/fl-oz/pint/quart/gallon are disallowed. Shared across all three prompt builders (web/photo/social) via one constant — don't duplicate the rule text back into each prompt if editing it.

**`item` no longer contains the preparation word.**
Since curated modifiers shipped, the parser strips the prep/state word out of `item` (`"Grated Mozzarella"` → `item: "Mozzarella"`) and stores a curated KEY in `modifiers[]`. The verbatim source is kept in `original` (present only when it differs from `item`). Do not assume `item` holds the full source phrase; read `original` for that.

**Modifiers store KEYs, not labels.** Each member of `modifiers[]` is a `PREPARATION_MODIFIERS` key (`GRATED`), resolved to an `en`/`ua` chip label via `modifierLabel()`. The parser is restricted to zero or one key; the edit UI is intentionally multi-select.

**Modifiers and sections are display-only.** They are excluded from search, pantry, and vocab matching — those still key off the hidden `en` head noun and `canonicalIngredientIds`. When adding a surface that serializes recipes, remember `lib/public-recipes/server.ts` **field-picks** ingredients/steps: any new ingredient/step field must be added to `sanitizeIngredient`/`sanitizeStep` or it silently drops from the public share page. (`clonePublicRecipe` spreads, so it needs no change.)

**Recipe-form metadata is row-bound.** `components/recipe-form/schema.ts` explicitly validates `rowId`, `modifiers`, `sectionId`, and `original`. Field-array removal and reordering therefore move metadata with the row; do not reintroduce positional merging in `use-recipe-save.ts`.

**There are TWO ingredient render paths — update both.** The private recipe detail renders ingredients through **`components/servings-calculator/`** (`recipe-detail/index.tsx` uses `ServingsCalculator`, not `IngredientsList`). `IngredientsList` (`recipe-detail/ingredients-list.tsx`) is only used by the **public share page** via `shared-recipe-detail`. Any ingredient-display change (like the modifier chip / section grouping) must be made in **both** — the servings calculator for the owner's view, and `IngredientsList` for the public view. Steps have one path (`InstructionsList`, reused by both). The servings calculator's `displayName` may show the localized canonical vocab name in "parsed" mode, so its rows carry the chip + `original` separately from `item`.

**Ingredients and steps group by section differently — use the right helper.** `lib/db/recipe-sections.ts` exports two groupers. Ingredients use **`groupBySectionId`** (catalog order, every member of a section coalesced into one group, ungrouped items last) — safe because ingredient order carries no meaning, and it survives legacy rows whose section members are interleaved. Steps use **`groupBySectionRuns`** (consecutive runs, order preserved, never reordered) because `step.order` is the cooking sequence; regrouping steps into buckets scrambles the recipe (that was a real bug: the detail list showed 1,4,2,3 while the cooking carousel stayed 1,2,3). A section that recurs later correctly yields a second run. Ungrouped ingredients render under a localized **"Main"** (`recipes.mainSection`) header when the recipe has sections; ungrouped steps get no header (they are just the main flow, matching `StepSlide`'s per-step eyebrow).

**Forced reconciliation is unblocked but not yet implemented.** The admin backfill (modifiers/sections enrichment) and the legacy step-order repair are both verified complete — 66/66 recipes clean, 0 dangling `sectionId`s, 0 non-contiguous step sections. Normal sync still never auto-overwrites a locally present recipe (a DB-side edit surfaces as a conflict); a **versioned** one-time server-adoption pass is the remaining step if you want clients to silently adopt the enriched server data instead of surfacing it as a review conflict. Keep the operational plan local because `plans/` is intentionally gitignored.

**Sentry noise is intentionally filtered, not silently missing.** `ignoreErrors` in `instrumentation-client.ts` drops `@serwist/next`'s service-worker registration rejections (`"Rejected"`, `reading 'waiting'`) — they only fire for crawlers/headless browsers that never run a service worker, not real users. `syncFetch` (`lib/sync-fetch.ts`) also swallows maintenance 503s and transient 502/503/504 upstream blips (deploys, Pi restarts) without reporting them. If you're debugging "why didn't this show up in Sentry," check these two filters before assuming the error never happened.

**URL parsing has no schema.org fast path.** `parseWebRecipe` always sends the page through the AI. Recipe JSON-LD is included only as labeled reference context and is checked against visible text; it is never returned directly. The AI emits `modifiers` and section labels in the same call. Bump `PARSER_VERSION` when the prompt changes so cached URLs re-parse.

**Apply migration `0023` before deploying this shape.** The Drizzle schema, public recipe reads, sync reads, Telegram saves, and normal recipe writes reference `recipes.sections`. Adding the nullable column first is backward-compatible with the old app; deploying the new app first causes `column sections does not exist` failures.

## PWA / Build

**The Pi can load e5-small in-process under Bun, but deployment may need trusted postinstalls.**
The Task 0 probe succeeded on the Pi with Bun 1.3.11 and produced a 384-dimensional vector through `@huggingface/transformers` / `onnxruntime-node`, so the Pi uses `EMBED_PROVIDERS=local`; no Node sidecar is required. Bun reported two blocked postinstall scripts during installation. If the native runtime fails after a fresh deploy, review them with `bun pm untrusted` and explicitly trust the required packages with `bun pm trust`, then reinstall. Do not introduce a sidecar unless the in-process probe actually fails on the deployed runtime.

**Production builds must use webpack.**
`bun run build` (which passes `--webpack`) is required for `@serwist/next`. The default Turbopack dev server is fine for local development but will not produce a valid service worker.

**`public/sw.js` is regenerated on every build.**
It is gitignored. Do not commit it. Running `bun run build` will always overwrite it.

**Recipe images deliberately bypass `next/image`.**
`RecipeImage` renders a plain `<img>` on a direct ImageKit CDN URL (`getOptimizedUrl` in `lib/imagekit-url.ts` → `?tr=w-…,f-webp,q-80`) instead of `next/image`. If it went through `/_next/image`, requests would hit Vercel's optimizer (cold-optimize latency + image-unit billing) and the service worker's `recipe-images` `CacheFirst` rule would never match — so the images could not be cached or prewarmed, and would double-optimize (ImageKit *then* Vercel). Consequence: the `biome-ignore lint/performance/noImgElement` on those `<img>` tags is intentional; don't "fix" it back to `next/image`. Other images (avatars, etc.) still use `next/image`.

**Recipe-image cache invalidation is automatic via unique URLs.**
Each ImageKit upload is uniquely named (`recipe-${Date.now()}` + ImageKit's unique suffix), so a recipe's `imageUrl` is immutable — changing a photo yields a *new* URL, orphaning the old `recipe-images` cache entry (swept by the 30-day / 400-entry `ExpirationPlugin`). The SW cache keys on the **full** URL including `?tr=` size params, so thumbnail (`w-300`) and hero (`w-800`) are separate entries and never collide. `prewarmRecipeImages` warms the exact hero URL (`HERO_IMAGE_WIDTH`) so opening a recipe hits a warm cache. Never re-add a cache-key plugin that strips the query string — it would collapse sizes and serve a blurry hero or oversized thumbnail.

**Env-dependent clients must not throw at module scope — `next build` evaluates them.**
Next's page-data collection imports route modules during the production build, so any client instantiated at module top-level runs with the build environment, which often lacks runtime secrets. A bare `throw new Error("X is required")` or `new Client(process.env.X!)` at module scope will fail the build. Two safe patterns are already in use — match one when adding a new client:
- **Lazy proxy** — defer construction (and the env check) to first property access. See `lib/redis.ts`: importing it never instantiates Redis; `REDIS_URL` is only required on the first actual call at request time.
- **Empty-string fallback** — `process.env.X ?? ""` so the constructor never throws at import; the call fails later with a real error if the value is genuinely missing. See `db/index.ts` (`postgres(process.env.DATABASE_URL ?? "")`) and `lib/upload/imagekit.ts`.

Never read a required secret with `!` or an unguarded `throw` at module scope.

**The iOS status bar needs a full-bleed paint layer and separately inset UI.**
Sonner notifications can repaint the Dynamic Island / notch area while they animate. The real application viewport therefore declares `viewport-fit=cover`; the declaration in `public/pwa-launch.html` applies only to that launch document and must not be treated as inherited after its redirect. Each PageStack entry has an opaque backdrop extended by the safe-area insets, while its scroll viewport retains the normal screen bounds. In standalone mode, `StatusBarScrim` uses that same full-screen background geometry at a higher `z-index` than Sonner so swipe layers cannot expose WebKit's white backing surface.

Do not turn `viewport-fit=cover` into global safe-area padding. In particular, the bottom nav stays at the fixed `var(--bottom-nav-offset)` (32px). WebKit miscalculates inset-based viewport height in installed apps, so standalone `html` and `body` use `min-height: 100vh`; removing it recreates the persistent bottom gap. Top-level controls apply `env(safe-area-inset-top)` locally. Pull-to-refresh keeps that inset inside its reserved height and fades its label in only after enough pull height exists, preventing clipped text beneath the scrim.

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
