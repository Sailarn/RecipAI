-- Cleanup #2: merge bare-staple UUID vocab rows into their seeded slugs.
--
-- Background: the first cleanup (cleanup-dup-ingredients.sql) kept three bare
-- staples as UUID survivors — but each already has a proper seeded slug that
-- aliases the bare/Ukrainian term:
--   flour  (ade1f14a…)  →  all-purpose-flour  (aliases "flour", "борошно")
--   pepper (b71bed24…)  →  black-pepper       (aliases "pepper", "перець")
--   bread  (d195510e…)  →  breadcrumbs        (ua "панірувальні сухарі")
-- Recipes already resolve to the slugs (0 recipes reference any UUID — the fuse
-- slug tie-break handles it). Only the user's Ukrainian pantry rows still point
-- at the UUIDs, plus the 3 orphan UUID vocab rows. This is data-only; no code.
--
-- HOW TO RUN:
--   1. Paste into the Supabase SQL editor (project: ijrijptpslyapyzebicg).
--   2. Run as-is first — it ends with ROLLBACK; the final SELECTs show the
--      resulting clean state for review (nothing persisted yet).
--   3. Verify: only legit UUID rows remain (kashkaval cheese, protein powder);
--      one pantry row each for flour/pepper/breadcrumb; no (user,ingredient)
--      pantry dupes.
--   4. When it looks right, change ROLLBACK → COMMIT and re-run.

BEGIN;

-- ── 1. Pantry: collapse each pair to the row we want, on the seeded slug ────

-- flour: keep "борошно" repointed to all-purpose-flour; drop the generated row.
DELETE FROM pantry WHERE ingredient_id = 'all-purpose-flour';
UPDATE pantry SET ingredient_id = 'all-purpose-flour'
  WHERE ingredient_id = 'ade1f14a-0ca8-4aa1-b986-136abf997a08';

-- pepper: keep "чорний перець" (already on black-pepper); drop bare "перець".
DELETE FROM pantry WHERE ingredient_id = 'b71bed24-7866-4932-a219-cbecebcfeee5';

-- breadcrumb: keep "панірувальні сухарі" repointed to breadcrumbs; drop generated.
DELETE FROM pantry WHERE ingredient_id = 'breadcrumbs';
UPDATE pantry SET ingredient_id = 'breadcrumbs'
  WHERE ingredient_id = 'd195510e-391f-45a5-a92b-d463a4427252';

-- ── 2. Recipes (defensive; expected 0 rows — they already use the slugs) ────
-- jsonb has no array_replace; swap element-by-element.

CREATE OR REPLACE FUNCTION _tmp_replace_jsonb_id(arr jsonb, old_id text, new_id text)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_agg(
    CASE WHEN elem #>> '{}' = old_id
    THEN to_jsonb(new_id::text)
    ELSE elem
    END
  )
  FROM jsonb_array_elements(arr) elem
$$;

UPDATE recipes
  SET canonical_ingredient_ids = _tmp_replace_jsonb_id(
    canonical_ingredient_ids, 'ade1f14a-0ca8-4aa1-b986-136abf997a08', 'all-purpose-flour')
  WHERE canonical_ingredient_ids @> '["ade1f14a-0ca8-4aa1-b986-136abf997a08"]'::jsonb;

UPDATE recipes
  SET canonical_ingredient_ids = _tmp_replace_jsonb_id(
    canonical_ingredient_ids, 'b71bed24-7866-4932-a219-cbecebcfeee5', 'black-pepper')
  WHERE canonical_ingredient_ids @> '["b71bed24-7866-4932-a219-cbecebcfeee5"]'::jsonb;

UPDATE recipes
  SET canonical_ingredient_ids = _tmp_replace_jsonb_id(
    canonical_ingredient_ids, 'd195510e-391f-45a5-a92b-d463a4427252', 'breadcrumbs')
  WHERE canonical_ingredient_ids @> '["d195510e-391f-45a5-a92b-d463a4427252"]'::jsonb;

DROP FUNCTION _tmp_replace_jsonb_id;

-- ── 3. Delete the 3 orphan UUID vocab rows ─────────────────────────────────

DELETE FROM ingredients WHERE id IN (
  'ade1f14a-0ca8-4aa1-b986-136abf997a08',  -- flour  → all-purpose-flour
  'b71bed24-7866-4932-a219-cbecebcfeee5',  -- pepper → black-pepper
  'd195510e-391f-45a5-a92b-d463a4427252'   -- bread  → breadcrumbs
);

-- ── 4. Verification queries ────────────────────────────────────────────────

-- Should list only the legit UUID rows (kashkaval cheese, protein powder):
SELECT id, en FROM ingredients
WHERE id ~ '^[0-9a-f]{8}-' AND status='confirmed'
ORDER BY en;

-- Should show exactly one row per staple, on the slug id, with your label:
SELECT ingredient_id, name FROM pantry
WHERE ingredient_id IN ('all-purpose-flour','black-pepper','breadcrumbs')
ORDER BY ingredient_id;

-- Should return 0 rows (no user holds the same ingredient twice):
SELECT user_id, ingredient_id, count(*) FROM pantry
WHERE ingredient_id IS NOT NULL
GROUP BY user_id, ingredient_id HAVING count(*) > 1;

-- ── Change ROLLBACK → COMMIT once the output looks right ───────────────────
ROLLBACK;
