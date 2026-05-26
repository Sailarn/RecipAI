# TODO

## Re-enrich Ingredients (local AI script)

**Script:** `scripts/re-enrich-ingredients.ts`  
**Run:** `bun run scripts/re-enrich-ingredients.ts` (dry-run) · add `--apply` to write changes  
**Model:** `OLLAMA_MODEL=qwen2.5:14b` (or gemma3:12b, llama3.3:70b)

**Problem:** AI parser over-normalises — "зелений перець" and "червоний перець" both become "Bell pepper" → wrong vocab match. Original text is in `recipes.ingredients[i].item`, so misses can be fixed post-import.

**What the script does:**

1. **Load** — pull all vocab entries + all recipes from Postgres (Drizzle)
2. **Analyse** — batch 15–20 ingredients per Ollama call; prompt gives original text + current vocab match; AI responds with `ok`, `remap` to existing vocab id, or `new_entry` (en/ua/category/aliases)
3. **Plan** — print summary table + all proposals grouped by recipe (default dry-run, no writes)
4. **Apply** (`--apply`) — insert new vocab entries (`status: "confirmed"`) + rewrite `canonicalIngredientIds` arrays in Postgres; Dexie untouched (users see fixes on next login via `syncRecipes()`)

**After running:**
- Check `scripts/re-enrich-ingredients.log` for skipped items
- If new vocab entries added → `bun run scripts/generate-vocab-embeddings.ts`
- Optionally re-run `bun run scripts/test-vocab-coverage.ts`

**Flags:** `--recipe-ids=abc,def` · `BATCH_SIZE=8`

---

## profile/page.tsx refactor

Work through these in order — each is independent, pick what's needed.

- [ ] **Extract `Toggle` component** — the `Toggle` function defined at the top of `profile/page.tsx` is a real component
  - Move to `app/[locale]/profile/toggle.tsx` (profile-only for now)
  - Re-import in `profile/page.tsx`

- [ ] **Inline styles → Tailwind (layout only)** — two categories, treat them differently:
  - Layout/spacing props (`display: flex`, `gap`, `padding`, `width`, `alignItems`) → convert to Tailwind classes
  - Design-token props (`color: "var(--fg-1)"`, `fontFamily: "var(--font-display)"`) → leave as `style={}`, Tailwind arbitrary syntax is noisier here
  - `ROW`, `ROW_LABEL`, `ROW_ICON`, `DIVIDER` constants at the top — once layout moves to Tailwind these likely shrink or disappear; no need to move to a separate file

- [ ] **Replace emojis with Lucide icons** — `🌙` and `☀️` inside the toggle ball
  - `Moon` and `Sun` are already imported from `lucide-react` in the file
  - Size them to fit the 18×18px toggle ball (try `size={10}` or `size={11}`)

- [ ] **Raw `<button>` and `<h1>` — leave as-is**
  - Profile row buttons are custom-styled (full-width, transparent, unique padding) — shadcn `Button` variants don't match, fighting them adds friction
  - No typed `<h1>` / typography component in `components/ui/`, raw tag is fine

---

## After manual codebase review

- Merge `feat/ingredient-vocabulary` → `main`
- Run re-enrich script against production DB
