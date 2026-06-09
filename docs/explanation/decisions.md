# Architecture Decisions

Key choices made and why. Alternatives considered are noted where relevant.

---

## Next.js 16 App Router

Chosen for the file-based API routes, server components, and Vercel deployment target. The App Router's `maxDuration` per-route setting is critical for the parse route which needs up to 60 s for AI calls.

Turbopack is used for local dev (`bun run dev`). The production build uses webpack (`bun run build --webpack`) because `@serwist/next` does not yet support Turbopack.

---

## Dexie.js for local storage

IndexedDB via Dexie gives a typed, async API with full offline capability. Alternatives like SQLite WASM were considered but added complexity with no meaningful benefit for the data shapes here (JSON documents, not relational queries).

Dexie is the **local working store** — the UI reads and writes through it exclusively, so it never waits on the network. Supabase is read only on login (to reconcile changes from other devices) and written opportunistically in the background.

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

## Schema.org short-circuit

Before calling the AI, the web parser attempts to extract `@type: Recipe` JSON-LD from the page. If found with at least one ingredient, it is used directly — no AI call, no cost, near-instant. This works on most major recipe sites. The AI path is the fallback for SPAs and sites without structured data.

---

## Parse queue (job-based, not synchronous)

URL and video parses are enqueued as `parse_jobs` rows in Postgres rather than handled synchronously in the API route. This allows:
- Parsing to continue if the user navigates away.
- Vercel's `maxDuration: 60` per-invocation limit to be used without blocking the UI.
- Idempotent retries (the process route skips re-parsing in-flight jobs).

Photo parsing is synchronous (no queue) because photos are client-provided, smaller in scope, and don't require scraping.

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
