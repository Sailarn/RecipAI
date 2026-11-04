# Test the AI Connector

How to run the RecipAI connector (the remote MCP server at `/api/mcp`) locally and connect a real AI app to it. Design and scope are in the [AI Connector spec](../specs/ai-connector.md).

---

## How the pieces fit

| Piece | Where |
|---|---|
| MCP endpoint (tools) | `app/api/mcp/route.ts`, tools in `lib/mcp/tools/` |
| OAuth provider | better-auth `mcp` plugin in `lib/auth/auth.ts`, endpoints under `/api/auth/mcp/*` |
| Discovery metadata | `app/.well-known/oauth-protected-resource/`, `app/.well-known/oauth-authorization-server/` |
| Sign-in and consent pages | `app/external-auth/oauth/{login,consent}` |
| Consent hardening | `lib/auth/mcp-consent.ts` (consent is always shown; unconsented codes are refused) |

The URL the AI app needs is `<NEXT_PUBLIC_BETTER_AUTH_URL>/api/mcp`. In production that is `https://recip-ai-wine.vercel.app/api/mcp`.

---

## 1. Apply the migration

Migration `0026_oauth_provider` adds the `oauth_application`, `oauth_access_token` and `oauth_consent` tables. It only adds tables, so it is safe on the shared database:

```bash
DATABASE_URL="$SUPABASE_MIGRATION_URL" bun run db:migrate
```

---

## 2. Quick check with MCP Inspector (localhost)

```bash
bun run dev
```

```bash
npx @modelcontextprotocol/inspector
```

In the Inspector, pick **Streamable HTTP** and enter `http://localhost:3000/api/mcp`. Then use **Open Auth Settings → Quick OAuth Flow**. The browser opens the RecipAI sign-in (if you're signed out) and then the consent page. After **Allow**, connect and call `search` with an empty query.

!!! note
    The OAuth token endpoint (`/api/auth/mcp/token`) is served by better-auth and sends no CORS headers. If the Inspector's token step fails in the browser with a CORS error, switch it to the proxy connection type. Real AI apps call the token endpoint server-to-server and are unaffected.

---

## 3. Real Claude or ChatGPT (needs public HTTPS)

AI apps connect from their own servers, so `localhost` is unreachable. Use a tunnel with a **stable** hostname, for example an ngrok static domain:

```bash
ngrok http --url=<your-domain>.ngrok-free.app 3000
```

1. Set `NEXT_PUBLIC_BETTER_AUTH_URL=https://<your-domain>.ngrok-free.app` in `.env.local` and restart `bun run dev`. In development the configured host is added to the allowed auth hosts automatically.
2. Add `https://<your-domain>.ngrok-free.app/api/auth/callback/google` to the Google OAuth client's authorized redirect URIs. Passkeys are bound to their domain, so one created on `localhost` won't work on the tunnel. Use Google or Telegram.
3. **Claude:** Settings → Connectors → **Add custom connector** → URL `https://<your-domain>.ngrok-free.app/api/mcp` → **Connect**. Sign in, allow, then ask in a new chat: "List my RecipAI recipes".
4. **ChatGPT:** custom connectors need ChatGPT's developer mode, which is turned on in its connector settings. Menu names change often, so check OpenAI's current docs. Create a connector with the same URL and OAuth authentication.

In the RecipAI app, **Ask AI** on a recipe and **Profile → AI assistants** show each app's connection status (from `/api/mcp/connections`). Disconnect revokes the app's access at once.

A Vercel preview deployment works instead of a tunnel (`*.vercel.app` is an allowed dev host). The same Google redirect-URI caveat applies.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| The AI app says it can't find the authorization server | `NEXT_PUBLIC_BETTER_AUTH_URL` doesn't match the URL the app was given. Discovery documents use it as the issuer and resource. |
| Consent page says the request expired | Consent codes live 10 minutes. Start again from the AI app. |
| Changes from the AI app don't show in RecipAI | Expected until the next sync: devices pull on sign-in, when the app returns to the foreground, and on pull-to-refresh. |
| Tools return "Recipe not found" | Tools only see recipes synced to the account. Local-only recipes (created while signed out and never synced) are invisible. |
| The connection drops after an hour | The client didn't request `offline_access`. The server grants it by default (`MCP_DEFAULT_SCOPE`); check the client's requested scopes. |
