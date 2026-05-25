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

## After manual codebase review

- Merge `feat/ingredient-vocabulary` → `main`
- Run re-enrich script against production DB
