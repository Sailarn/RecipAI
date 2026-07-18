# Getting Started

How to run RecipAI locally from scratch.

---

## Prerequisites

- [Bun](https://bun.sh) (runtime + package manager)
- [Python 3](https://python.org) (optional — only needed for the documentation commands)
- A Supabase project (for Postgres + auth)
- A Google Gemini API key
- A PhantomJsCloud key (web-page scraping)
- A Redis instance (rate limiting and anonymous upload tokens)
- An ImageKit account (durable recipe images)

Social imports additionally need Apify; Groq is only needed when a social source has downloadable media but no transcript.

---

## 1. Clone and install

```bash
git clone https://github.com/Sailarn/RecipAI.git
cd RecipAI
bun install
```

---

## 2. Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in at minimum:

```bash
DATABASE_URL=             # runtime URL; transaction pooler (6543) on Vercel
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_EXTERNAL_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=       # openssl rand -hex 32
GEMINI_API_KEY=           # Google AI Studio
PHANTOMJS_API_KEY=        # PhantomJsCloud (free tier available)
REDIS_URL=                # Upstash Redis or local Redis
IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=
NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL=
```

See [Environment Variables](../reference/env.md) for the full list and optional vars.

---

## 3. Run database migrations

```bash
DATABASE_URL="$SUPABASE_MIGRATION_URL" bun run db:migrate
```

Load `SUPABASE_MIGRATION_URL` into your shell from your secret manager using Supabase's direct connection (port 5432). If your local network cannot reach the direct IPv6 endpoint, use the Supavisor **session** pooler (port 5432). The one-command override takes precedence over the runtime `DATABASE_URL` in `.env.local` and applies all Drizzle migrations without making the transaction-pooler URL the migration connection.

---

## 4. Start the dev server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). The app uses Turbopack in dev mode.

---

## 5. Parse your first recipe

1. Navigate to the parse page (the AI icon in the bottom nav).
2. Paste any recipe URL.
3. Tap **Parse** — the job is queued and processed in the background.
4. When done, you'll see the parsed recipe ready to save.

No account is required for parsing and saving. Recipes are stored locally in IndexedDB (Dexie) and work offline.

---

## 6. Verify everything works

```bash
bun run check:ci    # lint + format check
bun run typecheck   # TypeScript
bun run test --run  # full test suite, all should pass
```

---

## Optional: set up Google sign-in

Add to `.env.local`:
```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials. Add `http://localhost:3000` as an authorised origin and `http://localhost:3000/api/auth/callback/google` as a redirect URI.

---

## Optional: preview the docs

```bash
pip3 install -r docs-requirements.txt
bun run docs:build  # strict build and link check
bun run docs       # opens localhost:8000
```
