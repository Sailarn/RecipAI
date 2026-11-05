# Handoff: ingredient matching fixes (Nov 2026)

Status as of 2026-11-05. Written for whoever continues this; read it top to bottom before touching data.

## Where things stand
| Part | State |
|---|---|
| Production data fix (vocab + 22 recipes) | **Done** in Supabase, verified |
| Matcher code fix | **Committed, not released**: commit `d44578d` on branch `claude/vigilant-babbage-c7ja2l` (not on `main`) |
| This handoff doc | Branch `claude/ingredient-matching-handoff` |

## How ingredient matching works (read before changing anything)
- Each recipe has `ingredients` (jsonb list of `{ item, ... }`) and `canonical_ingredient_ids` (jsonb list of vocab ids, **index-aligned** with `ingredients`; `""` where nothing matched). `unrecognized_ingredients` holds "to taste"-style lines.
- The vocabulary is the `ingredients` table: `id` (slug for curated rows, UUID for rows that started as provisionals), `en`, `ua`, `category`, `aliases_en`, `aliases_ua` (jsonb arrays), `status` (`confirmed` / `provisional` / `failed`), `embedding` (vector(384), multilingual-e5-small, embedded from `en` with the "passage" prefix).
- Matching runs **on the device** (`lib/parse-recipe/normalize-ingredients.ts`), per ingredient:
  1. Text match against confirmed vocab (`lib/parse-recipe/vocab-match.ts`): exact whole-phrase name/alias containment first, then Fuse fuzzy on the whole line, then word by word.
  2. Embedding match on the server (`/api/ingredients/embed-match`, `lib/db/vocab-vector-search.ts`, threshold 0.88 and a 0.02 gap to the runner-up).
  3. Otherwise a provisional vocab row is created and enriched by AI (`/api/ingredients/enrich`), which may merge it into an existing confirmed row with the same `en` (re-pointing recipes and pantry).
- Devices only recompute a recipe's ids when it has **no** ids or the **count differs** from its ingredients (`lib/db/normalize-pending-recipes.ts`, `lib/db/renormalize-recipes.ts`), or when the user edits its ingredients. So a server-side fix that keeps the array length is kept by devices.
- Devices pull vocab incrementally by `updated_at` (`pullVocab`, watermark `ingredientsSyncedAt`). New/changed vocab rows must get `updated_at = now()`. **Deleting** vocab rows needs a `reconcileVocab` version bump (`lib/db/reconcile-vocab.ts`), because the delta pull never deletes.
- Recipes sync server-wins on the next pull; bump `recipes.updated_at` when changing them server-side.
- Pantry rows reference vocab ids (`pantry.ingredient_id`): never change or delete an id without re-pointing pantry.

## What was wrong
Example: "соус наршараб" was linked to **alfredo sauce**. Root causes:
1. The word-by-word Fuse fallback accepted two-word names from one shared word ("соус" → "соус Альфредо", "філе" → "філе індички", "чилі" → "чилі олія").
2. Whole-line Fuse accepted a vocab name longer than the text ("філе" as a prefix of "філе індички").
3. Fuse let a different first letter through on short words ("сливки" → "оливки", "nuts" → "peanut").
4. Bad vocab aliases: chives had "кропу"/"кропів" (dill forms), pilaf seasoning had generic "spices"/"favorite spices"/"суміш спецій універсальна", cream cheese had "cheese (for serving, optional)".
5. Recipes from the Telegram bot and from Claude (MCP `create_recipe`) carry no English name per ingredient, so they're matched on Ukrainian text alone through the weakest (fuzzy) path.

## Done: production data (one transaction, 2026-11-05)
- **10 new confirmed vocab rows** (no embedding yet, see "Not done"): `pomegranate-molasses` (наршараб), `lavash`, `dried-herbs`, `fish-fillet`, `nigella-seed`, `mixed-nuts`, `peanut-butter`, `frozen-vegetables`, `sichuan-pepper`, `vanilla-bean`.
- **7 vocab rows corrected**: `chives`, `pilaf-seasoning`, `spice-mix`, `cream-cheese`, `red-pepper-flakes`, `chili-pepper`, `cream` (aliases only; ids unchanged).
- **22 recipes re-pointed** (same array lengths, `updated_at` bumped). Item → new target: соус наршараб → pomegranate molasses; кріп → dill; сливки 20% / вершки 20% → cream; whole wheat lavash → lavash; dried herbs → dried herbs; fish fillet → fish fillet; nigella seeds → nigella seed; nuts → mixed nuts; якісної арахісової пасти → peanut butter; заморожені овочі → frozen vegetables; szechuan peppercorns → sichuan pepper; ванільний стручок → vanilla bean; чилі пластівці → red pepper flakes; чилі (за бажанням) → chili pepper; ap flour → all-purpose flour; all-purpose / everything bagel seasoning, суміш спецій універсальна, spices for meatballs → spice mix; яєчні жовтки (Жовтки конфі) → egg yolk; крем-сир → cream cheese; sesame → sesame seed; філе (Куряча шинка) → chicken fillet (`dc359b29-36b4-48aa-952d-efedb49186f8`); філе стегна (Домашня лікарська ковбаска) → chicken thigh (owner confirmed both are chicken).
- **Verified**: no array length changed, no id points to a missing vocab row, only those 22 recipes differ from the backup.
- **Backup** of the previous state, outside the app's tables:
  - `backup.ingredient_fix_20261105_vocab`: full rows of the 7 corrected vocab entries.
  - `backup.ingredient_fix_20261105_recipes`: `id, canonical_ingredient_ids, updated_at` of every recipe with ids (138 rows).

## Done: matcher code (`d44578d`, NOT released)
`lib/parse-recipe/vocab-match.ts`: fuzzy hits must share the query's first letter and may not have more words than the text; the word-by-word fallback only accepts single-word names. Exact name matches unchanged. Tests in `lib/parse-recipe/__tests__/vocab-match.test.ts` (new block "no false matches from a shared first word or a look-alike word"); 469 related tests pass.

## Not done (in priority order)
1. **Release the matcher fix.** Merge `claude/vigilant-babbage-c7ja2l` (or cherry-pick `d44578d`) into `main` with the owner's OK. Until then, editing a recipe's ingredients can re-create the same kind of mismatch.
2. **Embeddings for vocab rows with `embedding IS NULL`** (the 10 new rows plus 9 older confirmed rows). Compute with the same model and prefix the server uses (`lib/embed`, local provider = `@huggingface/transformers` multilingual-e5-small, `passage` prefix, embed the `en` field) and `UPDATE ingredients SET embedding = ..., updated_at = now()`. Best as a small script run with `DATABASE_URL`, not by pasting vectors through a chat. Without vectors these rows are only reachable by text/alias match (fine for UA/EN names, weaker for odd English phrasings).
3. **Pass the English name into matching when known.** `normalizePendingRecipes` / `renormalizeOutdatedRecipes` send only `item`; the matcher accepts `en`/`ua` and tries `en` first. Recipe ingredients don't store `en` today, so this needs the parser (and MCP `create_recipe`) to keep an English head per ingredient. Optional, bigger change.
4. **Full regression run of the matcher** over all ~1,650 production ingredient lines with the production vocab, old vs new code, reviewing every changed result. Skipped to save credits; recommended before or right after release.
5. **Remaining doubtful mappings** (left as is; owner to decide): сир сулугуні → cheese (no suluguni entry), томати у власному соку → canned tomato sauce (`tomato-sauce-canned`; no "canned tomatoes" entry), peppercorns mixture → black pepper, суміш перців горошком → spice mix, крохмаль → potato starch, starch → cornstarch, шампіньони → mushroom.
6. **Vocab duplicates**: UUID rows like `0d1a2bfa-…` "oil" and `10d518d2-…` "flour" overlap slug rows (`vegetable-oil`, `all-purpose-flour`). Merging means re-pointing recipes and pantry, deleting the UUID row, and bumping the `reconcileVocab` version.
7. **Drop the backup** once the owner is happy: `drop schema backup cascade;`

## What to check
- After release: add a recipe through Claude with "соус наршараб", "філе", "чилі пластівці", "сливки 20%", "nuts" and confirm in the DB that none links to alfredo sauce, turkey breast, chili oil, olives or peanut (they should match the right entry or become new provisionals that AI enriches).
- On a phone with an existing library: after sync, open "Кучмачі з курячої печінки…" and check the pantry dot for наршараб isn't tied to alfredo sauce.
- Audit query for suspicious links (vocab name/alias not literally in the ingredient text); expect mostly foreign-language or inflected names:
```sql
with x as (
  select lower(i.elem->>'item') item, r.canonical_ingredient_ids->>((i.ord-1)::int) cid
  from recipes r cross join lateral jsonb_array_elements(r.ingredients) with ordinality i(elem, ord)
  where jsonb_typeof(r.canonical_ingredient_ids)='array'),
p as (select item, cid, count(*) n from x where coalesce(cid,'')<>'' group by 1,2),
names as (select g.id cid, lower(trim(nm)) nm from ingredients g,
  lateral (select g.en union all select g.ua union all select jsonb_array_elements_text(g.aliases_en)
           union all select jsonb_array_elements_text(g.aliases_ua)) t(nm) where nm is not null and trim(nm)<>'')
select p.item, g.en, g.ua, p.n from p join ingredients g on g.id=p.cid
where not exists (select 1 from names where names.cid=p.cid and
  (' '||regexp_replace(p.item,'[^[:alnum:]%'']+',' ','g')||' ') like ('% '||regexp_replace(names.nm,'[^[:alnum:]%'']+',' ','g')||' %'))
order by g.en;
```
- Integrity checks (both should return 0):
```sql
select count(*) from recipes where jsonb_typeof(canonical_ingredient_ids)='array'
  and jsonb_array_length(canonical_ingredient_ids) <> jsonb_array_length(ingredients);
select count(*) from recipes r, jsonb_array_elements_text(r.canonical_ingredient_ids) c
  where c <> '' and not exists (select 1 from ingredients g where g.id = c);
```

## Rollback (if ever needed)
```sql
begin;
update recipes r set canonical_ingredient_ids = b.canonical_ingredient_ids, updated_at = now()
  from backup.ingredient_fix_20261105_recipes b
  where r.id = b.id and r.canonical_ingredient_ids is distinct from b.canonical_ingredient_ids;
update ingredients g set aliases_en = b.aliases_en, aliases_ua = b.aliases_ua, updated_at = now()
  from backup.ingredient_fix_20261105_vocab b where g.id = b.id;
-- The 10 new vocab rows can stay (nothing points to them after the recipe rollback);
-- deleting them would need a reconcileVocab version bump.
commit;
```
Note the recipe rollback also reverts any later id changes on those recipes; check `updated_at` first.
