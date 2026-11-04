# Plan: list RecipAI in Claude's Connectors Directory

**Branch:** `claude/vigilant-babbage-c7ja2l` (from `main` at v2.32.1). Never commit to `main` directly. Merge only when the owner says so.
**Goal:** a one-tap "Connect" for RecipAI inside Claude (web, desktop and mobile) through a directory listing, instead of pasting a custom-connector URL. ChatGPT comes later, separately.
**Handoff:** each step is one commit, pushed right away. If the cloud session stops, continue locally from the first unchecked box.

Background: [AI Connector spec](ai-connector.md), "Later: directory listings". Anthropic docs:
[submission](https://claude.com/docs/connectors/building/submission.md),
[review criteria](https://claude.com/docs/connectors/building/review-criteria.md),
[authentication](https://claude.com/docs/connectors/building/authentication.md),
[Software Directory Policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy).

## Decisions (owner)
- Slug: **`recipai`** (permanent).
- Category: **Food & cooking**.
- Icon: the app icon, `public/icon-512x512.png`.
- Support contact: **denis9524@gmail.com**.
- Reviewer account: **`denis9524+recipai-review@gmail.com`**, email and password, created by us, with sign-up disabled.
- Reviewer sign-in: a **hidden page** that isn't linked anywhere, `/external-auth/review`. The login screens users see don't change. Anthropic asks for "every link, credential, and step", so a dedicated link fits.
- The privacy page is in English and is reachable from Profile.
- Tools: **merge** `list_recipes` and `get_recipe` into `search` and `fetch` (which ChatGPT also needs), so there are no duplicate tools.
- Annotations: every tool that writes is `destructiveHint: true`, as Claude's rules require. Users get an "Allow / Always allow" prompt once per tool.

## Steps
- [x] **0. This plan** (docs only).
- [x] **1. Tool merge.**
  - `search(query)`:
    - empty query → newest recipes
    - words match the title, description, ingredient names **and collection names**
    - returns up to 50 results as `{ results: [{ id, title, url, category, servings, totalTimeMinutes, tried }] }`
  - `fetch(id)` → `{ id, title, text, url, metadata }`, where `metadata` holds the full structured recipe from `toRecipeView`.
  - Remove `list_recipes` and `get_recipe`. Update the server instructions ("look recipes up with search, read one with fetch") and the tool descriptions, plus any that mention list_recipes or get_recipe (NOT_FOUND message, update_recipe, collections).
  - Tests: `lib/mcp/__tests__/server.test.ts`, `lib/recipes/__tests__/*`.
- [x] **2. Annotations.**
  - `create_recipe`, `update_recipe`, `import_recipe`, `create_collection`, `add_to_collection`, `remove_from_collection` → `destructiveHint: true`.
  - Every tool keeps a `title`, and read tools keep `readOnlyHint: true`.
  - Add a test that every tool has `title` plus `readOnlyHint: true` or `destructiveHint: true`.
- [x] **3. Refresh-token rotation.** When the refresh grant on `/api/auth/mcp/token` succeeds, delete the old `oauth_access_token` row, so a used refresh token stops working. Implement it as a better-auth hook next to `lib/auth/mcp-consent.ts`. Test that the old refresh token returns 401 `invalid_grant`.
- [x] **4. Privacy page.**
  - `app/privacy/page.tsx`, outside the `[locale]` tree, with no locale prefix (add `privacy` to the `proxy.ts` matcher exclusions).
  - Covers:
    - **what's collected:** account data (Google, Telegram, passkeys), recipes and collections, pantry, imported links and photos, parse history, usage analytics (PostHog with masked session recordings, Vercel Analytics), error reports (Sentry), server logs (Axiom)
    - **why**
    - **who processes it:** Supabase, Vercel, Upstash, ImageKit, Google Gemini, OpenAI, DeepSeek, Groq, Apify, PhantomJsCloud, scrape.do, Telegram, Google sign-in
    - **AI connector access**, and how disconnecting revokes it
    - **retention**
    - **deletion** by emailing denis9524@gmail.com (there's no in-app delete yet)
    - **contact**
  - Add a "Privacy policy" row in Profile.
- [x] **5. Connector docs page.** `app/connector/page.tsx` (public, English):
  - what RecipAI is
  - how to connect (directory listing, or custom connector URL `https://recip-ai-wine.vercel.app/api/mcp`)
  - sign-in and consent
  - each tool in plain words
  - **three example prompts**: save a recipe from pasted text, import an Instagram reel, find and edit a recipe
  - disconnecting, and the support email
- [x] **6. Review account.**
  - Enable better-auth `emailAndPassword` with `disableSignUp: true`.
  - Hidden page `app/external-auth/review/page.tsx` with an email-and-password form. On success, it shows "Signed in. Go back to Claude and click Connect".
  - The connector login page (`components/connector-auth/connector-login.tsx`) re-checks the session on focus or visibility change, and continues to the authorize URL once a session exists. That way a reviewer who signs in on the review page in another tab gets back to consent.
  - Seed script `scripts/seed-review-account.ts`: creates the user and a credential account with a hashed password (password from env `REVIEW_ACCOUNT_PASSWORD`, never committed), plus around 6 made-up sample recipes (sections, amounts, steps, one with a photo URL) and 2 collections. It must be idempotent. Run it against production once, or seed through the Supabase connector.
  - Tests for the page and the auto-continue.
- [x] **7. Docs.** Update `docs/reference/api-routes.md` (tools, `/privacy`, `/connector`, the review page), `docs/specs/ai-connector.md`, and this checklist.
- [x] **8. Submission text**, drafted in `docs/specs/claude-directory-submission.md`:
  - name, one-liner (200 characters max) and description (2,000 max)
  - categories, URLs and support
  - use cases, company and authentication
  - data handling
  - reviewer steps
  - answers to the compliance checklist
- [ ] **9. Verify and hand over.**
  - full tests, `bun run typecheck`, `bun run check:ci` and `bun run build`
  - end-to-end check against a local Postgres (see `docs/how-to/test-ai-connector.md`)
  - push the branch and ask the owner to merge
  - after release: run the seed for production and check `/privacy`, `/connector` and the review page live

## After the merge (owner)
1. Set `REVIEW_ACCOUNT_PASSWORD` in your local env, then run the seed script against production. Or ask Claude to seed it through the Supabase connector.
2. Submit at `claude.ai/directory/manage` → Submit new → MCP connector, using `claude-directory-submission.md`.
3. After the listing is live: switch the app's "Connect Claude" button to `https://claude.ai/directory/connectors/recipai` (a follow-up).

## Notes for whoever continues
- Run `bun install` first. `graphify` isn't installed in the cloud; ignore the hook's request.
- Local end-to-end testing: Postgres 16 at `/var/tmp/recipai-pg` in the cloud, or any local Postgres. Apply `db/migrations` (skip the `vector` extension lines if pgvector is missing).
- Commit messages: conventional commits with a lowercase subject (commitlint). The pre-commit hook runs the full test suite.
- Push after every commit: `git push -u origin claude/vigilant-babbage-c7ja2l`.
