# RecipAI

AI-powered recipe management app. Import from any recipe URL, supported social post, or photo — recipes are parsed by AI and saved to your device. No account required; sign in to sync across devices.

## Features

- **AI import** — paste a URL or upload a photo; the app extracts title, ingredients, steps, and images automatically
- **Social imports** — Instagram posts/Reels, TikTok, YouTube videos/Shorts, and X/Twitter posts are parsed through caption, transcript, media, and image context
- **Collections** — organise recipes into named groups
- **Ingredient vocabulary** — ingredients are normalised to a shared vocabulary across your recipes
- **Pantry** — track what you have at home
- **Sync** — sign in to back up and access recipes across devices
- **PWA** — installable on iOS and Android, works offline for browsing saved recipes
- **Bilingual** — Ukrainian 🇺🇦 and English 🇬🇧

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, Radix UI, Motion |
| Local storage | Dexie.js (IndexedDB) |
| Database | Supabase Postgres, Drizzle ORM |
| Auth | better-auth (Google, Passkey, Telegram) |
| AI | Gemini + OpenAI fallback |
| Scraping | PhantomJsCloud (primary), scrape.do (fallback) |
| Images | ImageKit |
| Infrastructure | Redis (rate limiting), Sentry, Serwist (PWA) |
| i18n | next-intl |
| Testing | Vitest, React Testing Library |

## Getting started

```bash
bun install
cp .env.example .env.local   # fill in required vars
bun run db:migrate
bun run dev
```

See [docs/tutorial/getting-started.md](docs/tutorial/getting-started.md) for the full setup guide including required environment variables.

## Commands

```bash
bun run dev           # dev server (Turbopack, localhost:3000)
bun run build         # production build (webpack — required for PWA)
bun run test          # Vitest (watch mode)
bun run test --run    # Vitest (single run, CI)
bun run check:ci      # Biome lint + format check (warnings = errors)
bun run docs          # MkDocs preview (localhost:8000)
```

## Docs

Developer documentation lives in `docs/` and is viewable with `bun run docs`.
