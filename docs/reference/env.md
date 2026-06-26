# Environment Variables

All variables live in `.env.local` (never committed). Copy `.env.example` as a starting point.

---

## Core

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Supabase Postgres connection string. Use the **pooler** URL for serverless (port 6543), not the direct connection. |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Yes | Full base URL of the app (`https://recipai.pp.ua`). Used by better-auth for redirect and cookie domain. |
| `NEXT_PUBLIC_EXTERNAL_AUTH_URL` | Yes | Public external-auth base URL. In production it must use a different origin from the app (`https://auth.recipai.pp.ua`). The Google callback is `https://auth.recipai.pp.ua/api/auth/callback/google`. |
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
| `EMBED_PROVIDERS` | Yes | Ordered comma-separated provider chain. `local` loads `Xenova/multilingual-e5-small` in-process; `http:<base-url>` calls `<base-url>/api/embed`, with a 10-second timeout before trying the next entry. Use `local` on the Pi and `http:https://recipai.pp.ua` on Vercel. |
| `EMBED_SHARED_SECRET` | Yes | Shared secret sent as `x-embed-secret` between HTTP providers and `/api/embed`. Use the same strong value on the Pi and Vercel. |

If the configured chain is empty or every provider fails, ingredient embed matching degrades to provisional creation. Restart the server after changing either variable.

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
| `IMAGEKIT_PUBLIC_KEY` | Yes | ImageKit public key — used client-side for upload authentication. |
| `IMAGEKIT_PRIVATE_KEY` | Yes | ImageKit private key — used server-side to generate upload tokens. |
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
| `REDIS_URL` | Yes | Redis connection URL (Upstash or self-hosted). Used for AI parse rate limiting — anonymous: 15 req/hour, signed-in: 60 req/hour. Rate limiting fails open if Redis is unreachable, but the app will not start if this variable is missing entirely. |
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
