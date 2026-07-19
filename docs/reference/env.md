# Environment Variables

Developer-supplied variables live in `.env.local` (never committed). Copy `.env.example` as a starting point. Platform-provided variables such as `NODE_ENV`, `CI`, and `VERCEL` are not listed here.

---

## Core

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Runtime Supabase Postgres connection string. Use the transaction pooler (port 6543) on Vercel. For `bun run db:migrate`, override this variable with the direct connection (port 5432), or the Supavisor session pooler (port 5432) from an IPv4-only migration host. |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Yes | Full base URL of the app (`https://recipai.pp.ua`). Used by better-auth for redirect and cookie domain. |
| `NEXT_PUBLIC_EXTERNAL_AUTH_URL` | Production | Public external-auth base URL. `http://localhost:3000` is sufficient for ordinary local development, but account linking requires a different origin in every environment. Production uses `https://auth.recipai.pp.ua`; its Google callback is `https://auth.recipai.pp.ua/api/auth/callback/google`. |
| `BETTER_AUTH_SECRET` | Yes | Random secret for signing sessions. Generate with `openssl rand -hex 32`. Read directly by the `better-auth` library from the environment — not referenced in app code, but required. Without it, sessions are re-keyed on every server restart. |

---

## AI

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key. The app cycles through the Gemini model chain defined in `lib/ai.ts` until one succeeds. |
| `OPENAI_API_KEY` | No | OpenAI API key. Only used as a last resort after every Gemini model in the chain fails. Uses `gpt-4o-mini`. Omit to disable the fallback entirely. |

---

## Embeddings

The e5-small model runs on server infrastructure, never in the browser. Every deployment that performs ingredient matching needs an ordered provider chain.

| Variable | Required | Description |
|---|---|---|
| `EMBED_PROVIDERS` | Yes* | Ordered comma-separated provider chain. `local` loads `Xenova/multilingual-e5-small` in-process; `http:<base-url>` calls `<base-url>/api/embed`, with a 10-second timeout before trying the next entry. Use `local` on the Pi and `http:https://recipai.pp.ua` on Vercel. |
| `EMBED_SHARED_SECRET` | HTTP only** | Shared secret sent as `x-embed-secret` between HTTP providers and `/api/embed`. Use the same strong value on the caller and embedding host. A local-only chain that does not expose `/api/embed` can omit it. |
| `EMBED_MODEL_CACHE_DIR` | No | Only relevant with a `local` provider. Caches the downloaded model outside `node_modules`, so a redeploy's `bun install` doesn't wipe it and force a ~50s re-download on the next cold load. Defaults to the package's in-package cache when unset. |

\*`EMBED_PROVIDERS` is required on deployments that call the provider chain for ingredient matching or enrichment. If the chain is empty or every provider fails, matching degrades to provisional creation.

\**`EMBED_SHARED_SECRET` is required when the chain contains an `http:` provider and on the host serving `/api/embed`. Restart the server after changing embedding variables.

---

## Scraping

| Variable | Required | Description |
|---|---|---|
| `PHANTOMJS_API_KEY` | Yes | [PhantomJsCloud](https://phantomjscloud.com) key. Primary HTML scraper — renders JavaScript so SPA recipe pages are readable. |
| `SCRAPE_DO_TOKEN` | No | [scrape.do](https://scrape.do) token. Fallback scraper used when PhantomJsCloud fails. Omit to disable the fallback. |
| `APIFY_TOKEN` | No | [Apify](https://apify.com) token for social parsing actors (Instagram, TikTok, YouTube, X/Twitter). Required for social URL parsing. Omit to disable. |
| `GROQ_API_KEY` | No | Groq API key for Whisper transcription. Required only when a social actor returns downloadable video/audio without a transcript. Static posts, actor-provided transcripts, and videos rejected by the 30-minute duration cap do not need it. |

---

## Images

All image uploads go through [ImageKit](https://imagekit.io).

| Variable | Required | Description |
|---|---|---|
| `IMAGEKIT_PUBLIC_KEY` | Yes | ImageKit public key supplied to the server-side ImageKit SDK alongside the private key. It is not read by browser code. |
| `IMAGEKIT_PRIVATE_KEY` | Yes | ImageKit private key used by the server-side SDK to upload and delete images. |
| `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | Yes | ImageKit CDN endpoint URL (e.g. `https://ik.imagekit.io/yourname`). |
| `NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL` | Yes | Fallback image URL shown when a recipe has no image. Should be an ImageKit URL. |

---

## Auth providers

### Google OAuth

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Yes* | Google OAuth 2.0 client ID. |
| `GOOGLE_CLIENT_SECRET` | Yes* | Google OAuth 2.0 client secret. |

\*Required for Google sign-in. Create credentials at Google Cloud Console → APIs & Services → Credentials.

### Telegram

| Variable | Required | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Yes* | Bot token from @BotFather. |
| `TELEGRAM_BOT_USERNAME` | Yes* | Bot username without `@` (server-side reference). |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Yes* | Same bot username — exposed to the client for the Telegram Login Widget. |
| `TELEGRAM_OIDC_CLIENT_SECRET` | Yes* | OIDC client secret for Telegram auth. |
| `TELEGRAM_WEBHOOK_SECRET` | No | Shared secret for verifying Telegram webhook requests. Generate with `openssl rand -hex 32`, then register via `setWebhook`. Only one instance should own the webhook — the last `setWebhook` call wins. An instance without this var set fails open (unauthenticated). |

\*Required for Telegram sign-in.

The **Telegram Mini App** (see [Telegram Mini App](../explanation/telegram-mini-app.md)) needs **no additional env vars** — `TELEGRAM_BOT_TOKEN` is the `initData` validation secret. Register the Mini App URL in @BotFather (Menu Button → Web App, or `/newapp`).

---

## Web Push

VAPID keys are required to send web push notifications when a recipe parse completes. Generate a fresh pair with `bunx web-push generate-vapid-keys`.

| Variable | Required | Description |
|---|---|---|
| `VAPID_PUBLIC_KEY` | Yes* | VAPID public key (URL-safe base64). |
| `VAPID_PRIVATE_KEY` | Yes* | VAPID private key (URL-safe base64). |
| `VAPID_SUBJECT` | Yes* | Contact email for push services (e.g. `mailto:you@example.com`). |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Yes* | Same as `VAPID_PUBLIC_KEY` — exposed to the client so the browser can subscribe. |

\*Required for push notifications. Omit all four to disable push: the client gates subscription on `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, so the browser never subscribes, and the server send becomes a no-op. The `/api/push/subscribe` route itself does **not** use the VAPID keys (it only stores the subscription), so it keeps working regardless.

---

## Infrastructure

| Variable | Required | Description |
|---|---|---|
| `REDIS_URL` | Yes | Redis connection URL (Upstash or self-hosted). Used for anonymous upload tokens, AI parse rate limiting (15 req/hour anonymous, 60 req/hour signed-in), and public embed-match limiting. The client (`lib/redis.ts`) is a lazy proxy, so a missing var does **not** block app startup or the build. Rate limiting fails open on the first Redis error, but parse-job creation still needs Redis to mint its upload token. |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN for error reporting. Omit to disable Sentry. |

---

## Analytics

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | No | PostHog Cloud EU project API key. Omit to disable all PostHog analytics and session replay. Events are sent via the `/ingest` Next.js rewrite proxy to bypass adblockers; the EU endpoint is hardcoded in `next.config.ts`. |

---

## Logging

| Variable | Required | Description |
|---|---|---|
| `AXIOM_TOKEN` | No | Axiom API token for structured server logs (AI call cost, rate limit hits, enrich completions). Omit to disable. |
| `AXIOM_DATASET` | No | Axiom dataset name (default: `recipai`). |

### Telemetry environment gate

PostHog and Axiom only send data when `NODE_ENV === "production"` (like Sentry). These opt-in flags let you exercise the pipeline locally without a production build. Restart the dev server after changing them.

| Variable | Required | Description |
|---|---|---|
| `TELEMETRY_DEV` | No | Set to `1` to enable the **server-side** vendors (Axiom, PostHog-node) in development. |
| `NEXT_PUBLIC_TELEMETRY_DEV` | No | Set to `1` to enable the **client-side** PostHog browser SDK in development. |

---

## Development

| Variable | Required | Description |
|---|---|---|
| `DEV_ORIGINS` | No | Comma-separated list of extra origins allowed to hit the Next.js dev server cross-origin (`allowedDevOrigins` in `next.config.ts`). Set to your machine's LAN IP(s) — e.g. `192.168.1.10,192.168.1.11` — to load the dev server from a phone or another device on the network. Dev-only; ignored in production builds. |

---

## Build-provided

| Variable | Source | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_VERSION` | `next.config.ts` | Injected from `package.json`; displayed in the profile and used to force a full vocabulary refresh after an app release. Do not set it manually. |
