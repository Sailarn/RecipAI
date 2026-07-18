# Architecture Decisions

Key choices made and why. Alternatives considered are noted where relevant.

---

## Next.js 16 App Router

Chosen for the file-based API routes, server components, and Vercel deployment target. The App Router's `maxDuration` per-route setting is critical for the parse route which needs up to 60 s for AI calls.

Turbopack is used for local dev (`bun run dev`). The production build uses webpack (`bun run build --webpack`) because `@serwist/next` does not yet support Turbopack.

---

## Dexie.js for local storage

IndexedDB via Dexie gives a typed, async API with full offline capability. Alternatives like SQLite WASM were considered but added complexity with no meaningful benefit for the data shapes here (JSON documents, not relational queries).

Dexie is the **local working store** — the recipe UI reads and writes through it exclusively, so it never waits on the network. The server-backed recipe and collection copies are read during reconciliation (initial sign-in, manual pull-to-refresh, and when the app returns to the foreground) and written opportunistically in the background. Parsing, public vocabulary, and other server-only capabilities still use their API routes directly.

---

## Supabase Postgres + Drizzle

Supabase provides a managed Postgres instance with a pooler URL for serverless (Vercel). Drizzle was chosen over Prisma for its lighter runtime and better TypeScript inference. The schema is version-controlled in `db/schema/` and migrations are generated via `drizzle-kit`.

---

## better-auth

Chosen for its first-class Drizzle adapter and support for Passkey (WebAuthn) out of the box. Supports Google OAuth, Passkey, and Telegram OIDC. Session gating is centralized in `requireSession()` — never inline `getSession` + null check.

---

## Multi-provider AI chain

The app tries Gemini models in order (`gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-2.5-flash-lite`) before falling back to OpenAI `gpt-4o-mini`. Gemini is free-tier; OpenAI is only used when `OPENAI_API_KEY` is set, keeping cost on the free tier by default.

Photo parsing uses the same chain with multimodal input (Gemini `inlineData`, OpenAI `image_url` with data URI).

---

## Schema.org short-circuit (removed)

The web parser once extracted `@type: Recipe` JSON-LD and used it directly when present — no AI call, near-instant. **This was removed.** A site's structured data is frequently incomplete: one real recipe's JSON-LD listed 14 of the 16 ingredients shown on its page. All URL parses now go through the AI. Recipe JSON-LD remains useful as labeled reference context alongside visible page text, but it is never trusted as the final result.

---

## Structured recipe sections and multi-select modifiers

Parsed ingredients emit zero or one curated modifier key, while saved ingredients use `modifiers[]` so users can add multiple preparation states. Parsed section labels are converted at the save boundary into one recipe-level `{ id, name, order }` catalog with `sectionId` references on ingredients and steps. This makes rename stable, lets step grouping be edited without rewriting ingredient metadata, and keeps matching/search independent of display annotations.

---

## Parse queue (job-based, not synchronous)

URL and video parses are enqueued as `parse_jobs` rows in Postgres rather than handled synchronously in the API route. This allows:
- Parsing to continue if the user navigates away.
- Vercel's `maxDuration: 60` per-invocation limit to be used without blocking the UI.
- Idempotent retries (the process route skips re-parsing in-flight jobs).

Photo parsing is synchronous (no queue) because photos are client-provided, smaller in scope, and don't require scraping. The route still records the terminal outcome in `parse_jobs` so photo history can sync across devices; the row is a history record, not queued work.

---

## Custom navigation stack

A custom iOS-style page stack (`lib/navigation-stack.tsx`) is used instead of Next.js router navigation for pushed views (recipe detail, edit, create). This gives slide-in/out animations and a reliable back gesture without requiring full page remounts. `useNavigate()` from `lib/transitions.ts` is the only way to navigate — never call `router.push` directly.

---

## Scraping: PhantomJsCloud primary, scrape.do fallback

PhantomJsCloud renders JavaScript, making it effective for SPAs. scrape.do is a simpler HTTP scraper used as a fallback when PhantomJsCloud fails. Site-specific extractors were considered but rejected in favour of the generic link-density trim (`trimChrome`) which works across sites without per-site maintenance.

---

## Redis for rate limiting and upload tokens

Upstash Redis provides the rate-limit counters (fixed-window INCR) and short-lived upload tokens for anonymous parse sessions. Rate limiting fails open — if Redis is unreachable, the request proceeds. Upload tokens expire after 30 minutes.

---

## Raspberry Pi as secondary host

The app runs on a Raspberry Pi 4 behind a Cloudflare Tunnel at `recipai.pp.ua` alongside the Vercel deployment. Both share the same Postgres database. The Pi is managed with PM2. Deployment is manual via SSH. The Telegram webhook can only point to one host — the Pi or Vercel, not both simultaneously.

---

## Snapshot-based public recipe sharing

Publishing uses the dedicated `PUT /api/recipes/[id]/visibility` boundary. It upserts the signed-in owner's current local recipe snapshot and marks it public, so even a recipe whose background sync has not completed can be shared immediately. Normal create, update, and bulk-sync routes cannot change visibility; revocation goes through the same dedicated route and is synchronous.

The public page reads only rows with `is_public = true` and sanitizes the persisted ingredient, step, and section JSON before rendering. Saving someone else's recipe creates a new private local recipe with fresh ingredient/step ids rather than linking the two records. This keeps ownership, later edits, and visibility independent.

---

## Curated ingredient input (tap, don't type)

Both ingredient-entry surfaces — **Add to Pantry** and the **recipe review/edit form** — use a single shared fullscreen picker (`components/ingredient-picker/`) over the **confirmed vocabulary**. There is no free-text ingredient creation in the UI.

The picker (`IngredientPicker`) is a portal-mounted slide-up grouped by category, with a single mode switch:

- **Multi-select** (`commit` prop) — the pantry's thin wrapper (`components/pantry/add-pantry-picker/`) bulk-adds the selection; items already in the pantry render dimmed/disabled.
- **Single-select** (`onPick` prop) — a recipe-form row taps to replace its ingredient; ingredients already used in the recipe render with the "selected" look but stay pickable (`markedIngredientIds`).

**Why.** Leading with a browsable grid kills the keyboard-squeeze that plagued the old autocomplete-in-a-bottom-sheet, and curated-only selection dissolves three problems at once: no provisional-id fragmentation, no junk/non-food input, and consistent bilingual names.

**What it deliberately does _not_ change.** Recipe ingredients still store `item` as free text, so parsed descriptive strings ("all-purpose flour, sifted") survive untouched; the picker only sets that string. Canonical linkage is unchanged — `canonicalIngredientIds` is still computed by `normalizeRecipeIngredients` **after save** (see [Ingredient Vocabulary](ingredient-vocabulary.md)), never in the form. The form **displays** each row localized to the active locale by resolving the stored text back through the vocabulary (`components/recipe-form/localize-item.ts`), matching the cooking view, while the stored value stays as-is until re-picked. Pantry `qty`/`unit`/`cat` became [dormant columns](../reference/data-model.md#pantry) written as defaults.
