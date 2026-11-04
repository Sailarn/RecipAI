# Claude directory submission: text to paste

Portal: [claude.ai/directory/manage](https://claude.ai/directory/manage) → **Submit new** → **MCP connector**.
Submit only after the listing branch is released and the review account is seeded (see [the plan](claude-directory-listing.md)). Fields follow the portal's steps, as filled in for the first submission (Nov 2026).

## 1. Connection
- **Server URL:** `https://recip-ai-wine.vercel.app/api/mcp`. The portal should show 11 tools, 0 resources, Auth: OAuth.
- **Users connect to different URLs:** leave unchecked.
- When adding it as a custom connector: Authentication **Sign in now**, OAuth client **Register automatically (DCR)**, no headers, transport **Streamable HTTP**. Don't pick "Claude's published identity" (CIMD): the server doesn't support it.
- After any server change to tools, click **Change** and reconnect so the portal re-reads them.

## 2. Tools
These sync from the server: 4 read-only (`search`, `fetch`, `get_import_status`, `list_collections`) and 7 write (`create_recipe`, `update_recipe`, `delete_recipe`, `import_recipe`, `create_collection`, `add_to_collection`, `remove_from_collection`). The portal reads each tool's display name from `annotations.title` (not the top-level `title`) and flags tools without it; there should be no suggestions.

## 3. Listing
- **Server name:** RecipAI
- **One-liner** (max 200 characters):
  > Save, find and edit recipes in your RecipAI library from Claude: paste a recipe, share a photo or link, or import an Instagram, TikTok or YouTube video.
- **Description** (max 2,000 characters):
  > RecipAI is a personal recipe library that turns recipes from websites, Instagram, TikTok, YouTube, photos and plain text into clean, structured recipes: ingredients with amounts and units, numbered steps, sections, servings and times. It syncs across your devices and works offline.
  >
  > The RecipAI connector brings that library into Claude:
  > • Save recipes from anything in the chat: text you paste, a photo or screenshot, or a web page Claude reads. Claude structures the recipe and saves it.
  > • Import social posts: send an Instagram, TikTok, YouTube or X link and RecipAI's own parser transcribes the video and saves the recipe.
  > • Find recipes by title, ingredient or collection, and read any recipe in full.
  > • Edit recipes: scale servings, swap ingredients, rewrite steps, change the photo, mark a recipe as cooked.
  > • Organise recipes into collections, or delete them (Claude asks first).
  >
  > Everything acts only on your own RecipAI account, and changes appear in the RecipAI app on its next sync. You can disconnect Claude at any time in RecipAI under Profile → AI assistants, which revokes access immediately.
- **Categories:** Productivity, Other. (The portal has no food category; avoid the health ones, since we answer "no personal health data".)
- **Documentation URL:** `https://recip-ai-wine.vercel.app/connector`
- **Privacy policy URL:** `https://recip-ai-wine.vercel.app/privacy`
- **Support contact:** `denis9524@gmail.com`
- **Icon:** `public/icon-512x512.png` from the repository.
- **Slug:** `recipai` (this is permanent).

## 4. Use cases
Shown only to reviewers. Each row is a use case plus an example prompt that works on the seeded review account.

| Use case | Example prompt |
|---|---|
| Save a recipe from a chat, photo or web page | Save this to RecipAI: Pancakes, serves 4. 200 g flour, 2 eggs, 300 ml milk, 1 tbsp sugar, a pinch of salt. Whisk into a batter, rest 10 minutes, fry thin pancakes. |
| Import a recipe from a social video | Import this recipe into RecipAI: https://www.youtube.com/shorts/… (a real recipe Short) |
| Find and adapt my recipes | Open my borscht recipe in RecipAI and change it to serve 8, doubling the beets. |

- **Prerequisites:** A free RecipAI account (sign in with Google, Telegram or a passkey at https://recip-ai-wine.vercel.app). No paid plan or other setup is needed.
- **Read/write capabilities:** Read and write. ("Read only" is preselected and triggers a warning because the write tools are annotated as writing.)

## 5. Company
- **Company name:** RecipAI
- **Company website:** `https://recip-ai-wine.vercel.app`
- **Primary contact:** Denys, `denis9524@gmail.com` (prefilled from the Claude account), role "Founder & developer".
- **Anthropic contact:** empty.

## 6. Authentication
Both are detected from the server; the portal's checks (connect 401, sign-in settings 200, sign-in provider 200) should all pass.
- **Authentication requirement:** Always required.
- **OAuth client:** Dynamic Client Registration (RFC 7591). PKCE S256; callback `https://claude.ai/api/mcp/auth_callback`.
- **Additional or static headers:** none. No Anthropic-held client.

## 7. Data handling
- **API ownership:** We own the API. The connector calls only RecipAI's own backend. That backend uses AI models and scrapers internally (listed in the privacy policy), but Claude never talks to them.
- **Personal health data:** No. Recipes, collections and pantry items aren't health data.
- **Sponsored or promoted content:** No.

## 8. Test & launch
- **Test setup instructions** (one text box: replace `<PASSWORD>` with the `REVIEW_ACCOUNT_PASSWORD` used for seeding, never commit it, and `<SHORT_LINK>` with a real recipe YouTube Short):

```
TEST ACCOUNT (already populated: 6 recipes and 2 collections)
Email: denis9524+recipai-review@gmail.com
Password: <PASSWORD>
The account contains: Ukrainian borscht, Thin pancakes, Quick chicken curry, Greek salad, Banana bread, Syrniki; collections "Weeknight dinners" and "Baking".

HOW TO CONNECT
1. In the same browser you use for Claude, open https://recip-ai-wine.vercel.app/external-auth/review and sign in with the email and password above. You will see "Signed in". This page exists only for reviewers; regular users sign in with Google, Telegram or a passkey, which have no email/password option.
2. In Claude, add the connector (Settings → Connectors, or the directory listing) and click Connect.
3. On the RecipAI page that opens, click Allow. If you see a sign-in page instead, sign in at the link from step 1 in another tab of the same browser and return; the page continues to Allow by itself.

PROMPTS THAT EXERCISE ALL 11 TOOLS
1. "Search my RecipAI recipes for baking." → search (matches the Baking collection: banana bread, syrniki)
2. "Show me the full borscht recipe from RecipAI." → search + fetch
3. "Change my RecipAI borscht to serve 8 and double the beets." → fetch + update_recipe
4. "Save this to RecipAI: Pancakes, serves 4. 200 g flour, 2 eggs, 300 ml milk, 1 tbsp sugar, a pinch of salt. Whisk into a batter, rest 10 minutes, fry thin pancakes." → create_recipe
5. "Import this recipe into RecipAI: <SHORT_LINK>" → import_recipe + get_import_status (usually done within a minute)
6. "What collections do I have in RecipAI?" → list_collections
7. "Create a RecipAI collection called Soups and add the borscht to it." → create_collection + add_to_collection
8. "Remove the borscht from the Soups collection." → remove_from_collection
9. "Delete the pancakes recipe I just saved." → delete_recipe (Claude asks for confirmation first)

SEEING CHANGES IN THE APP (optional)
On the "Signed in" page from step 1, click "Open RecipAI" to open the web app as the test account. The app picks up changes made in Claude when its tab is reopened or refreshed.

Support: denis9524@gmail.com
```

- **Self-tested:** ticked. All 11 tools were run as a custom connector in Claude, plus automated MCP client tests.
- Keep the review account untouched until the review ends. To reset it after testing: delete the account's extra rows and re-insert the seed rows (as done via the Supabase connector), or delete everything except `user`/`account` and re-run `bun run seed:review-account`.

## 9. Compliance
Tick all seven:
- **Directory guidelines:** read. Read-only and write tools are split, every tool has `annotations.title` plus `readOnlyHint` or `destructiveHint`, and errors are actionable.
- **First-party API:** the connector only calls RecipAI's own backend.
- **Financial transactions:** none.
- **AI media generation:** none. AI reads and structures recipes; nothing generates images, audio or video.
- **Tool descriptions:** they describe only what each tool does. They never name another tool or tell the model what to do (a server test enforces this); workflow advice lives in the server instructions. Recipe text from imported pages is returned as data.
- **Conversation data:** the connector receives only tool-call arguments. It never reads Claude's chats, memory or files.
- **Public documentation:** live at `https://recip-ai-wine.vercel.app/connector`.

**Additional notes:**

```
Independent developer project. The connector exposes the user's own RecipAI recipe library: 4 read-only tools (search, fetch, get_import_status, list_collections) and 7 write tools, all marked destructiveHint so Claude asks before changes. OAuth 2.1 with dynamic client registration and PKCE; refresh tokens rotate on use. Users can revoke access any time in RecipAI under Profile → AI assistants. RecipAI's backend uses AI models to read and structure recipes from text, photos and videos, but generates no images, audio or video. Docs: https://recip-ai-wine.vercel.app/connector · Privacy: https://recip-ai-wine.vercel.app/privacy
```

## 10. Review and submit
Before clicking Submit: make sure the latest server release is live, then reconnect in step 1 so the portal stores the current tools. Fix any "very short answer" warnings, then submit. Status and feedback show at claude.ai/directory/manage. Escalations: mcp-review@anthropic.com.
