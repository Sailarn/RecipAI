# Spec: RecipAI connector for Claude & ChatGPT

**Status:** planned, not yet implemented
**Branch:** `claude/vigilant-babbage-c7ja2l` (feature branch, never `main`)

This spec is written so that any agent or developer can pick the work up from
here. Progress is tracked in the [checklist](#checklist) at the bottom. Tick boxes
as commits land.

---

## 1. Goal

Signed-in RecipAI users can connect RecipAI to **Claude** (first) and **ChatGPT**
(second) as a connector. Inside those chat apps they can then read, search,
create and update **their own** recipes. The app gets an entry point on the
recipe detail page ("Ask Claude about this recipe").

A separate, smaller item in the same branch: recipes that arrive from the server
(Telegram bot, another device, the connector) should no longer appear silently.
Show a small "Updating recipes…" indicator and fade new cards in.

### Non-goals (v1)

- Anonymous or local-only users. A connector needs an account.
- Real-time push to open devices. The existing pull triggers stay (login,
  foreground, pull-to-refresh). Connector writes show up on the next pull.
- Uploading image binaries through the connector. An optional `imageUrl` is fine.
- Deleting recipes through the connector. Leave it out of v1.
- Directory listing in the ChatGPT or Claude stores. v1 is a custom connector
  added by URL.

---

## 2. How it works for the user

A connector is a **remote MCP server**: an HTTPS endpoint (`/api/mcp`) that
exposes tools. It is protected by **OAuth 2.1**, with RecipAI acting as the
authorization server.

**The RecipAI app cannot install the connector into Claude.** The user adds it
once from Claude's side. The OAuth sign-in happens during that one-time step,
started by Claude, not by a button in RecipAI.

### 2.1 One-time setup (per user, per chat app)

```mermaid
sequenceDiagram
    participant U as User
    participant C as Claude (web/app)
    participant R as RecipAI (/api/auth, /api/mcp)
    U->>C: Settings → Connectors → Add custom connector<br/>URL: https://recipai.pp.ua/api/mcp
    C->>R: GET /api/mcp (no token) → 401 + WWW-Authenticate
    C->>R: GET /.well-known/oauth-protected-resource[/api/mcp]
    C->>R: GET /.well-known/oauth-authorization-server
    C->>R: POST /api/auth/mcp/register (dynamic client registration)
    C->>U: open browser → /api/auth/mcp/authorize?…
    R->>U: not signed in → RecipAI login page (Google / passkey / Telegram)
    R->>U: consent page "Allow Claude to read and edit your recipes?"
    U->>R: Allow
    R->>C: redirect with code → C exchanges at /api/auth/mcp/token (PKCE)
    C-->>U: "RecipAI connected"
```

The connector is then available in every Claude chat, on web and in the mobile
apps (connectors added on the web carry over to the apps).

### 2.2 Per-recipe "Ask Claude" (entry point in the RecipAI app)

1. The user taps **Ask Claude** on a recipe detail page.
2. If the user **has connected** RecipAI to Claude (the server knows, see
   §5.3), RecipAI opens
   `https://claude.ai/new?q=<url-encoded prompt>`, where the prompt is something like
   *"Use RecipAI to open my recipe "Borscht" (id `abc123`) and help me with it."*
   Claude calls `get_recipe` and the conversation starts with the recipe in context.
3. If the user **has not connected** yet, a bottom sheet explains the one-time
   setup (§2.1). It has a "Copy connector URL" button and an "Open Claude
   settings" link. After connecting, the user taps **Ask Claude** again.

> ⚠️ **To verify:** the `?q=` prefill on `claude.ai/new` is not officially
> documented and has reportedly changed behaviour before. Fallback: copy the
> prompt to the clipboard, open `https://claude.ai/new`, and show a toast
> saying "Prompt copied, paste it in Claude". Check the same for ChatGPT
> (`https://chatgpt.com/?q=`).

### 2.3 Recipe detail buttons

The page currently has **Start cooking** (full-width, primary) and **Open post /
Source** (full-width, secondary). A third full-width button is too much.
Proposed layout:

```
[            Start cooking             ]   ← unchanged
[  Open post  ] [ ✦ Ask Claude  ▾ ]         ← two half-width buttons
```

- When there is no `sourceUrl`, **Ask Claude** takes the full row.
- Once ChatGPT is supported, the button becomes **Ask AI ▾** with a small menu
  (Claude / ChatGPT), and it remembers the last choice per device in localStorage.
- Icons: use the official Claude and ChatGPT marks from each company's
  brand or press kit, following their brand guidelines. The marks may show
  compatibility, but must not suggest endorsement, and must not be recoloured
  or distorted. Check before shipping. If in doubt, ship a generic sparkle icon
  with the text label.
- Show the button only for signed-in users.

---

## 3. Architecture

### 3.1 What already exists and is reused

| Piece | Where | Reuse |
|---|---|---|
| Auth | `lib/auth/auth.ts` (better-auth 1.6.33, Drizzle adapter) | Add the `mcp` plugin |
| Owner-scoped recipe CRUD | `app/api/recipes/route.ts`, `app/api/recipes/[id]/route.ts` | Extract into `lib/recipes/` service, shared by REST and MCP |
| Write whitelist | `app/api/recipes/recipe-write-fields.ts` (`pickRecipeContent`) | Reused by the service |
| Server-side save | `lib/parse-recipe/save-parsed-recipe-server.ts`, `parsed-recipe-shape.ts` (`buildSavedRecipeShape`) | `create_recipe` builds the stored shape the same way |
| Parse queue | `app/api/parse-queue/*` | `import_recipe` enqueues a normal parse job for the user |
| Ingredient normalisation | Client-side, `normalizePendingRecipes` / `normalizePulledRecipes` | **Nothing new.** Server-written recipes are normalised on the device after pull, as already happens for Telegram-bot saves |
| Sync | `hooks/use-sync-on-login.ts`, `lib/db/reconcile-plan.ts` (server wins) | Connector writes reach devices on the next pull |
| Rate limiting | `lib/rate-limit.ts` (Redis) | Per-user limits on MCP tools |
| Pages outside the locale tree | `app/external-auth/*` (own layout plus `intl-provider`, excluded in `proxy.ts` matcher) | Host the OAuth login and consent pages here |

### 3.2 better-auth `mcp` plugin (in the installed 1.6.33)

Verified against the published `better-auth@1.6.33` package:

- `import { mcp } from "better-auth/plugins"`, with options
  `{ loginPage: string; resource?: string; oidcConfig?: OIDCOptions }`.
  Inside `oidcConfig`: `consentPage`, `scopes`, `requirePKCE`,
  `accessTokenExpiresIn` (default 3600 s), `refreshTokenExpiresIn` (default 604800 s),
  `allowPlainCodeChallengeMethod` (default false, S256 only).
- Endpoints (under `/api/auth`): `/.well-known/oauth-authorization-server`,
  `/.well-known/oauth-protected-resource`, `/mcp/authorize`, `/mcp/token`,
  `/mcp/register` (dynamic client registration), `/oauth2/consent`,
  `/mcp/get-session`.
- Next.js helpers exported from the same module: `withMcpAuth(auth, handler)`
  (returns 401 with `WWW-Authenticate: Bearer resource_metadata=…` when there is
  no or a bad token), `oAuthDiscoveryMetadata(auth)`, and
  `oAuthProtectedResourceMetadata(auth)`.
- New DB models: `oauthApplication`, `oauthAccessToken`, `oauthConsent`, which
  need a Drizzle migration.
- Default scopes are `openid profile email offline_access`. Refresh tokens are
  issued only when `offline_access` is granted.
- **Deprecation:** `mcp` wraps `oidcProvider`, which upstream is deprecating in
  favour of `@better-auth/oauth-provider` (a `release-1.6` line exists on npm).
  Use the built-in `mcp` plugin for v1: no new dependency, and it matches the
  pinned version. Migrating is a follow-up, recorded in `docs/explanation/decisions.md`.

### 3.3 New routes and files

```
app/.well-known/oauth-authorization-server/[[...path]]/route.ts  → oAuthDiscoveryMetadata(auth)
app/.well-known/oauth-protected-resource/[[...path]]/route.ts    → oAuthProtectedResourceMetadata(auth)
app/api/mcp/route.ts                     → MCP Streamable HTTP endpoint (GET/POST/DELETE), wrapped in withMcpAuth
app/api/mcp/connections/route.ts         → (phase 3) GET: which AI clients the session user has connected; DELETE: revoke
app/external-auth/oauth/login/page.tsx   → loginPage for the mcp plugin
app/external-auth/oauth/consent/page.tsx → consentPage
lib/recipes/service.ts                   → listRecipes / searchRecipes / getRecipe / createRecipe / updateRecipe (owner-scoped)
lib/recipes/schemas.ts                   → zod input schemas shared by REST and MCP
lib/mcp/server.ts                        → builds the McpServer and registers tools for a given userId
lib/mcp/tools/*.ts                       → one file per tool
db/schema/auth.ts (+ migration)          → oauthApplication, oauthAccessToken, oauthConsent
```

Notes:

- The catch-all `[[...path]]` on both `.well-known` routes is needed because
  MCP clients try the **path-suffixed** form first
  (`/.well-known/oauth-protected-resource/api/mcp`,
  `/.well-known/oauth-authorization-server/api/auth`) and then the root.
- `proxy.ts` matcher `"/((?!…|.*\\..*).*)"` already skips any path containing
  a dot, so `/.well-known/*` is **not** touched by next-intl or the maintenance
  gate. `/api/mcp` **does** go through the maintenance gate, which is fine and
  returns 503 during maintenance.
- `app/external-auth/*` is already excluded from the i18n middleware and has its
  own intl provider, so the OAuth pages work there without locale prefixes.
- MCP transport: use **stateless** Streamable HTTP (no session ids), so it works
  the same on Vercel serverless and on the Pi. Add `@modelcontextprotocol/sdk`
  as a direct dependency, pinned to an exact version as the repo does. Prefer
  the SDK's Web-standard (Fetch `Request`/`Response`) Streamable HTTP transport
  if the pinned version has one. Otherwise use `mcp-handler`, which adapts the
  SDK to Next.js route handlers. Decide at implementation time and record it in
  `decisions.md`.
- `resource` in the plugin config = `${NEXT_PUBLIC_BETTER_AUTH_URL}/api/mcp`.

### 3.4 Login resume (risk to verify early)

When `/mcp/authorize` finds no session, it redirects to `loginPage` with the
original query string, and the plugin's after-sign-in hook is supposed to resume
the authorize flow. RecipAI's logins are **redirect-based** (Google, Telegram
OIDC) or **WebAuthn** (passkey). Verify that the resume works for each one. If the
hook does not fire after a social redirect, the login page should pass
`callbackURL = /api/auth/mcp/authorize?<original query>` to `signIn.social`,
and navigate there itself after a passkey or Telegram success.

### 3.5 Tools

All tools run as the token's `userId`. Every query filters on
`recipes.userId = userId`. Inputs are validated with zod. Outputs are compact JSON
text plus a short human summary. They are localised with the user's locale when
known, otherwise English.

| Tool | Phase | Input | Behaviour |
|---|---|---|---|
| `list_recipes` | 1 | `{ query?, category?, collectionId?, limit≤50, cursor? }` | Title / description / ingredient-text match. Returns `id, title, category, servings, totalTime, updatedAt` |
| `get_recipe` | 1 | `{ id }` | Full recipe: ingredients (with sections), steps, times, source URL, collections, public share URL if public |
| `create_recipe` | 2 | `{ title, description?, servings?, prepTime?, cookTime?, category?, ingredients[{item, amount?, unit?, section?}], instructions[{instruction, section?}], sourceUrl?, imageUrl? }` | Uses `buildSavedRecipeShape`. `id = crypto.randomUUID()`, `isPublic=false`. Normalisation happens on the device after pull |
| `update_recipe` | 2 | `{ id, …partial of the create fields }` | Owner-scoped. Replacing `ingredients` or `instructions` rebuilds the shape. Bumps `updatedAt`, clears `canonicalIngredientIds` when ingredients change (so the device re-normalises). Returns `not_found` when no row matched |
| `import_recipe` | 2 | `{ url }` | Enqueues a parse job for the user (same path as an in-app link import, including dedupe by source). Returns the job id and status. A `get_import_status` tool or polling via `get_recipe` follows |
| `list_collections` | 2 | `{}` | `id, name, emoji, count` |
| `add_to_collection` | 2 | `{ recipeId, collectionId }` | Updates `collectionIds` |

Tool annotations: read tools `readOnlyHint: true`; write tools
`destructiveHint: false`, `idempotentHint` where true.

### 3.6 Security

- Tokens are scoped to one user. Tools never take a `userId` argument.
- PKCE S256 is required. Plain is off. The consent page names the client
  (`oauthApplication.name`) and says what it grants.
- Rate limits (Redis, per user): reads 120/min, writes 30/min, `import_recipe`
  10/hour (it costs AI and scraping money). These numbers are tunable.
- Payload caps: reuse `lib/api-limits.ts`, for example max ingredients and
  steps, and max string lengths.
- Revoke: phase 3 adds "Connected AI apps → Disconnect" in Profile, which deletes
  that client's `oauthAccessToken` rows for the user.
- Telemetry: a `mcp_tool_called` event (tool name, client name, success). Never
  log recipe content or tokens. Report errors to Sentry as the other routes do.
- Recipe text returned to the model is the user's own data. Imported pages could
  contain prompt-injection text. That is acceptable, because tools only touch
  the user's own recipes and there is no delete.

---

## 4. Testing locally

### 4.1 MCP Inspector (no tunnel, fastest loop)

```bash
bun run dev
```

```bash
npx @modelcontextprotocol/inspector
```

In the Inspector: transport **Streamable HTTP**, URL
`http://localhost:3000/api/mcp`, then **Connect**. It runs the full OAuth flow in
your browser against localhost (sign in, consent), then lists the tools and lets
you call them.

### 4.2 Real Claude (needs a public HTTPS URL)

Claude connects from Anthropic's servers, so `localhost` will not work. Use a tunnel
with a **stable** hostname. An ngrok free static domain or a named Cloudflare
tunnel both work.

```bash
ngrok http --url=<your-static-domain>.ngrok-free.app 3000
```

Then:

1. Set `NEXT_PUBLIC_BETTER_AUTH_URL=https://<domain>` in `.env.local` and restart
   `bun run dev`. In development, `getAllowedAuthHosts` already adds the
   configured host.
2. Sign-in on the tunnel origin: add
   `https://<domain>/api/auth/callback/google` to the Google OAuth client's
   authorized redirect URIs. Passkeys are bound to their domain, so a passkey
   made on localhost will not work on the tunnel domain. Use Google.
3. In Claude: Settings → Connectors → Add custom connector →
   `https://<domain>/api/mcp`, then Connect, sign in and allow.
4. In a new chat, ask "List my RecipAI recipes".

Alternative to the tunnel: a Vercel preview deployment (`*.vercel.app` is
already an allowed dev host). Same Google redirect-URI caveat.

### 4.3 Database

The migration only **adds** tables. `local dev → shared Supabase` is safe, but apply
it once with `DATABASE_URL="$SUPABASE_MIGRATION_URL" bun run db:migrate` before
running the branch, as `docs/how-to/deploy-pi.md` describes.

### 4.4 Automated

Vitest unit tests for `lib/recipes/service.ts` (owner scoping, not-found,
validation) and each tool handler (mock the service). Also a route test for
`/api/mcp` returning 401 with `WWW-Authenticate` when there is no token. Run
`bun run test --run`, `bun run typecheck` and `bun run check:ci` before each push.

---

## 5. Phases & commits

Small, reviewable commits. Conventional Commit messages (commitlint is enforced).
Each phase ends in a state the owner can pull and test.

### Phase 0: spec
- `docs(spec): plan RecipAI AI connector` (this file plus mkdocs nav)

### Phase 1: Claude, read-only, testable end to end ← **owner tests here**
1. `feat(auth): add better-auth mcp plugin and oauth tables`: plugin config,
   Drizzle schema plus generated migration, env docs (`docs/reference/env.md`)
2. `feat(auth): oauth login and consent pages for connectors`:
   `app/external-auth/oauth/{login,consent}`, uk + en strings
3. `feat(auth): serve oauth discovery metadata under /.well-known`
4. `refactor(recipes): extract owner-scoped recipe service`: REST routes use
   `lib/recipes/service.ts`, zod schemas, tests. No behaviour change apart from a
   correct 404 on PATCH of a missing recipe
5. `feat(mcp): add /api/mcp with list_recipes and get_recipe`, plus tests
6. `docs(mcp): how to connect and test the connector`: move §4 into
   `docs/how-to/test-ai-connector.md`, and `docs/reference/api-routes.md`

### Phase 2: write tools
7. `feat(mcp): create_recipe and update_recipe`
8. `feat(mcp): import_recipe via parse queue`
9. `feat(mcp): list_collections and add_to_collection`
10. `feat(mcp): per-user rate limits and telemetry for tools`

### Phase 3: in-app entry point
11. `feat(mcp): connections endpoint (status + revoke)`
12. `feat(recipe-detail): Ask Claude button with setup sheet`: half-width
    layout (§2.3), prefill URL with clipboard fallback
13. `feat(profile): connected AI apps section with disconnect`

### Phase 4: ChatGPT
14. Verify the same server in ChatGPT (developer mode / custom connector). Fix
    anything specific to it, such as metadata, scopes or callback quirks.
15. `feat(recipe-detail): Ask AI menu with Claude and ChatGPT`

### Phase 5: sync visibility (separate scope, after the above)
16. `feat(sync): show an "Updating recipes…" pill while reconciling`:
    `useSyncOnLogin` exposes `isSyncing` through `SyncContext`. A small,
    **non-white**, tinted glass pill (design tokens, works in light and dark)
    near the top of the recipes list. It appears only if the sync runs longer
    than ~300 ms, so instant syncs don't flash. Optionally show "+N new" when
    it finishes and something was applied.
17. `feat(recipes): fade in recipes that arrive from sync`: `applyReconcile`
    returns the ids it applied, and the list (`components/recipe-virtual-list`)
    fades and slides those cards in with `motion` (opacity 0→1, y 6→0, ~250 ms).
    Respect `prefers-reduced-motion`.

---

## 6. Open questions (defaults used if unanswered)

1. **Button layout:** half-width row (Open post | Ask Claude). *Default: yes.*
2. **Official logos vs a generic sparkle icon:** *Default: official marks, if
   their brand guidelines allow it on review. Otherwise a sparkle icon plus text.*
3. **Production domain for the connector URL:** `https://recipai.pp.ua/api/mcp`?
   The Pi and Vercel share the DB, so either works. Pick one canonical URL.
4. **Token lifetime:** access 1 h, refresh 7 days (plugin defaults). A longer
   refresh token (30 days) means fewer reconnects. *Default: 30 days.*
5. **Optional periodic pull** while the recipes list is visible (for example every
   2 minutes), so connector or Telegram additions appear without switching apps.
   *Default: not in this branch.*

---

## Checklist

- [x] Phase 0: spec
- [ ] Phase 1: OAuth + read-only MCP (Claude testable)
- [ ] Phase 2: write tools
- [ ] Phase 3: in-app entry point
- [ ] Phase 4: ChatGPT
- [ ] Phase 5: sync indicator + fade-in

## Notes for a handoff agent

- `.claude/settings.json` has hooks that ask for `graphify query` before
  grep or read. `graphify` is **not installed** in cloud containers, so fall back to
  normal search.
- `node_modules` is not installed in a fresh container. Run `bun install` first.
- Never push to `main`. Work only on the branch named at the top.
