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

## Overflow detection

**Use `getBoundingClientRect`, not `scrollHeight`.**
`scrollHeight` is inflated under `overflow: hidden`. Compare `getBoundingClientRect` heights to detect actual overflow. See `components/recipe-form/use-scroll-overflow.ts`.

---

## PWA / Build

**Production builds must use webpack.**
`bun run build` (which passes `--webpack`) is required for `@serwist/next`. The default Turbopack dev server is fine for local development but will not produce a valid service worker.

**`public/sw.js` is regenerated on every build.**
It is gitignored. Do not commit it. Running `bun run build` will always overwrite it.

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

**The cold-start splash uses two different mechanisms — don't unify them.**
The iOS WKWebView white flash happens *before first paint* and cannot be fixed with CSS or a React component (both render too late). So the splash is split by context:
- **Installed PWA** → `public/pwa-launch.html` is the manifest `start_url`. It is a zero-CSS static shell that paints `#0a0a0a` instantly; WebKit holds it visible until the real app's first paint, then it JS-redirects. It is intentionally excluded from the middleware matcher (`.html` extension), so it is served as-is.
- **Browser tab** → the `LaunchSplash` React component (mounted in `app/[locale]/layout.tsx`). It runs a before-paint effect that no-ops when `display-mode: standalone` (i.e. inside the PWA, where `pwa-launch.html` already handled it).

Theme changes reload to re-trigger the splash: `ThemeToggle` calls `location.replace('/pwa-launch.html?from=…')` in the PWA, but a plain `location.reload()` in the browser (so the component path fires). `pwa-launch.html` validates `?from=` is a single-leading-slash same-origin path before redirecting — it is a public file, so an unvalidated `from` would be an open redirect.
