# Run Tests

## Commands

```bash
bun run test              # run all tests (Vitest, watch mode)
bun run test --run        # run once and exit (CI mode)
bun run test:ui           # open Vitest browser UI
bun run test:coverage     # run with coverage report
```

!!! warning "Use `bun run test`, not `bun test`"
    `bun test` is Bun's native runner and breaks Vitest globals. Always use `bun run test`.

---

## Stack

- **Runner:** Vitest
- **DOM:** happy-dom
- **Component testing:** React Testing Library
- **IndexedDB:** fake-indexeddb (auto-loaded in `vitest.setup.ts`)
- **Config:** `vitest.config.mjs`

---

## Test file locations

Mirror the source file under `__tests__/` in the same directory:

```
lib/db/recipes.ts
lib/db/__tests__/recipes.test.ts

components/recipe-card/index.tsx
components/recipe-card/__tests__/index.test.tsx

app/api/parse-queue/route.ts
app/api/parse-queue/__tests__/route.test.ts
```

---

## Conventions

- `describe` per component/hook, nested `describe` per scenario group, `it` per case.
- Arrange / Act / Assert with blank lines between sections — no comment headers.
- Assert on observable outcomes (return values, mock call args, call counts) — not implementation details.
- When mocking `useNavigate`, always include all three methods:
  ```ts
  vi.mock("@/lib/transitions", () => ({
    useNavigate: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  }));
  ```
- **Copy assertions use translation keys, not English.** `vitest.setup.ts` mocks `next-intl` globally so `useTranslations()` returns the key it was given. Assert `getByText("statusTried")`, never `getByText("Tried ✓")` — the copy changes whenever wording or language does, the key doesn't. A test that genuinely needs real translations can override with a local `vi.mock("next-intl", …)`.
- For `vi.mock` factories that reference module-level constants, use `vi.hoisted`:
  ```ts
  const mockFn = vi.hoisted(() => vi.fn());
  vi.mock("@/lib/something", () => ({ myFn: mockFn }));
  ```

---

## Before pushing

```bash
bun run check:ci    # Biome lint + format (warnings = errors)
bunx tsc --noEmit   # TypeScript
bun run test --run  # All tests must be green
```

For a quick local pass, `bun run check:all` (uses `scripts/check.sh`) runs typecheck + lint + tests. Note it runs `biome lint` rather than `biome ci`, so it skips the format check and does not treat warnings as errors — `bun run check:ci` is the authoritative pre-push gate that matches CI.

For documentation changes, install the docs dependencies once and run the strict build:

```bash
pip3 install -r docs-requirements.txt
bun run docs:build
```

The strict build catches invalid MkDocs configuration, missing navigation targets, and broken internal links.
