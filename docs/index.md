# RecipAI

AI-powered recipe management app. Import from a recipe URL, supported social post, or photo — recipes are parsed by AI and saved to your device. No account required; sign in to sync across devices or publish a recipe with a shareable link.

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Dexie.js (IndexedDB) · Supabase Postgres · Drizzle ORM · better-auth · AI parsing (Gemini + OpenAI) · Redis · Serwist (PWA) · next-intl

---

## Quick links

| I want to… | Go to |
|---|---|
| Understand how parsing works | [Parse Pipeline](explanation/parse-pipeline.md) |
| Understand ingredient matching | [Ingredient Vocabulary](explanation/ingredient-vocabulary.md) |
| Understand analytics and error monitoring | [Observability](explanation/observability.md) |
| Understand local storage and sync | [Local Storage & Sync](explanation/local-storage-and-sync.md) |
| Understand authentication and reconciliation | [Auth & Sync](explanation/auth-and-sync.md) |
| Understand public recipe sharing | [Architecture Decisions](explanation/decisions.md#snapshot-based-public-recipe-sharing) |
| Look up a Dexie table or Postgres column | [Data Model](reference/data-model.md) |
| Find which file to edit | [Library Map](reference/lib-map.md) |
| Look up an API route | [API Routes](reference/api-routes.md) |
| Look up an environment variable | [Environment Variables](reference/env.md) |
| Set up the project locally | [Getting Started](tutorial/getting-started.md) |
| Run tests and documentation checks | [Run Tests](how-to/run-tests.md) |
| Deploy to the Raspberry Pi | [Deploy to Pi](how-to/deploy-pi.md) |
| Deploy to Vercel | [Deploy to Vercel](how-to/deploy-vercel.md) |
