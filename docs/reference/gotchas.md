# Gotchas

Non-obvious behaviours and hard-won lessons. If something acts weird, check here first.

---

## Database

**Supabase dates are strings.**
JSON from Supabase (`fetch` responses, `useSyncOnLogin`) has `createdAt`/`updatedAt` as ISO strings. Dexie expects `Date` objects. Always convert: `createdAt: new Date(row.createdAt)`. The `parseTimestamps` helper in `hooks/use-sync-on-login.ts` does this for recipes and collections.

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
