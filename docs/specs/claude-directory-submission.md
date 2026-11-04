# Claude directory submission: text to paste

Portal: [claude.ai/directory/manage](https://claude.ai/directory/manage) → **Submit new** → **MCP connector**.
Submit only after the listing branch is released and the review account is seeded (see [the plan](claude-directory-listing.md)). Fields follow the portal's steps.

## 1. Connection
- **Server URL:** `https://recip-ai-wine.vercel.app/api/mcp` (or pick your existing "RecipAI" custom connector).
- **Users connect to different URLs:** no.

## 2. Tools
These sync automatically. You should see 11 tools: 4 read-only (`search`, `fetch`, `get_import_status`, `list_collections`) and 7 write (`create_recipe`, `update_recipe`, `delete_recipe`, `import_recipe`, `create_collection`, `add_to_collection`, `remove_from_collection`). None should be flagged.

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
- **Categories:** Food & cooking.
- **Documentation URL:** `https://recip-ai-wine.vercel.app/connector`
- **Privacy policy URL:** `https://recip-ai-wine.vercel.app/privacy`
- **Support contact:** `denis9524@gmail.com`
- **Icon:** `public/icon-512x512.png` from the repository.
- **Slug:** `recipai` (this is permanent).

## 4. Use cases
- **Primary use cases:**
  1. Save a recipe found or discussed in a chat (text, photo, web page) into the user's library.
  2. Import a recipe from an Instagram, TikTok, YouTube or X video.
  3. Find, read and adapt the user's own recipes (scale, substitute, plan meals) and save the changes.
- **What users need before connecting:** a free RecipAI account (sign in with Google, Telegram or a passkey at https://recip-ai-wine.vercel.app). No paid plan.
- **Reads or writes:** both.

## 5. Company
- **Company name:** RecipAI (independent developer: Denys)
- **Website:** `https://recip-ai-wine.vercel.app`
- **Primary contact:** `denis9524@gmail.com`

## 6. Authentication
- **Authentication requirement:** required.
- **Authentication method:** OAuth 2.0 with Dynamic Client Registration (`oauth_dcr`). The server supports PKCE S256 and the callback `https://claude.ai/api/mcp/auth_callback`.
- **Anthropic-held OAuth client:** leave empty.

## 7. Data handling
- **Underlying API:** our own (first-party). The connector calls only RecipAI's own backend.
- **Personal health data:** no.
- **Sponsored content:** no.

## 8. Test & launch
- **Test account:**
  - Email: `denis9524+recipai-review@gmail.com`
  - Password: *(the `REVIEW_ACCOUNT_PASSWORD` you used when seeding; never commit it)*
- **Access instructions** (paste as-is):
  > The test account is already populated: 6 recipes (borscht, pancakes, chicken curry, Greek salad, banana bread, syrniki) and 2 collections (Weeknight dinners, Baking).
  >
  > 1. In the same browser you'll use for Claude, open https://recip-ai-wine.vercel.app/external-auth/review and sign in with the email and password above. You'll see "Signed in". (This page is only for reviewers; regular users sign in with Google, Telegram or a passkey.)
  > 2. In Claude, open Connectors, add RecipAI, and click Connect.
  > 3. On the RecipAI page that opens, click **Allow**. If you see a sign-in page instead, sign in at the link from step 1 in another tab of the same browser, then return; it continues to Allow by itself.
  > 4. Try these prompts:
  >    - "Search my RecipAI recipes for baking." (search; should list banana bread and syrniki)
  >    - "Open my borscht recipe in RecipAI and change it to serve 8, doubling the beets." (fetch + update_recipe)
  >    - "Save this to RecipAI: Pancakes, serves 4. 200 g flour, 2 eggs, 300 ml milk, 1 tbsp sugar, a pinch of salt. Whisk into a batter, rest 10 minutes, fry thin pancakes." (create_recipe)
  >    - "Import this recipe into RecipAI: https://www.youtube.com/shorts/…" with any recipe Short (import_recipe + get_import_status)
  >    - "Create a RecipAI collection called Soups and add the borscht to it." (create_collection + add_to_collection)
  >    - "Delete the pancakes recipe I just saved." (delete_recipe; Claude asks for confirmation)
  >
  > To see the changes in the RecipAI web app, click **Open RecipAI** on the "Signed in" page from step 1.
- **Confirm you've run every tool yourself:** yes. All 11 have been run end to end against the server (custom connector in Claude and automated MCP client tests).

## 9. Compliance
Check all seven. Notes for your own sanity:
- **Directory guidelines:** OK. Read-only and write tools are split, every tool is annotated, and errors are actionable.
- **First-party API:** OK. The connector only calls RecipAI's own backend.
- **Financial transactions:** none.
- **AI media generation:** none. No image, audio or video generation.
- **Prompt injection:** OK. Tool descriptions describe only behavior and contain no hidden instructions. Recipe text from imported pages is returned as data.
- **Conversation data collection:** OK. The connector never reads Claude's chats, memory or files.
- **Public documentation:** `https://recip-ai-wine.vercel.app/connector`.

## 10. Review and submit
Fix any "very short answer" warnings, then submit. Status and feedback show at claude.ai/directory/manage. Escalations: mcp-review@anthropic.com.
