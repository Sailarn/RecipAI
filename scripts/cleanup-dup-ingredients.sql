-- Cleanup: collapse 8 duplicate confirmed ingredient-vocabulary rows.
--
-- Background: the enrichment route was confirming provisionals in place without
-- checking for existing canonicals of the same name. This created 7 dup groups
-- (8 removable rows) in `ingredients`. Once removed, the updated enrich route
-- prevents new ones; the client reconcile migration re-pulls the clean vocab.
--
-- HOW TO RUN:
--   1. Paste into the Supabase SQL editor (project: ijrijptpslyapyzebicg).
--   2. Run as-is first — it ends with ROLLBACK, so nothing is persisted; the
--      final SELECTs show the resulting clean state for review.
--   3. Both verification SELECTs at the bottom should return 0 rows.
--      ingredient deletes = exactly 8 rows.
--   4. When it looks right, change ROLLBACK → COMMIT and re-run.
--
-- Survivors and losers (queried 2026-06-15 from live DB):
--   salt        survivor = 'salt'                                  loser = '1cc6de7e-2f79-40b1-92e9-639af3a6b1c0'
--   garlic      survivor = 'garlic'                                loser = '25dd19f5-7d1c-4671-a860-bef4b634ab54'
--   butter      survivor = 'butter'                                loser = 'ec9bcbfb-9f7f-4f0a-ba41-d64a0e48da40'
--   egg  (×3)   survivor = 'egg'                                   losers = 'f982eadc-8e6b-4afb-8a4c-c33ded64f502', 'b79cde77-83c2-4851-9fbd-6198810e175e'
--   flour (×2)  survivor = 'ade1f14a-0ca8-4aa1-b986-136abf997a08' loser = '5fbe774d-7384-481d-86d6-56db17763dda'
--   pepper (×2) survivor = 'b71bed24-7866-4932-a219-cbecebcfeee5' loser = '586bb4d9-e2ef-41af-82bb-cb3c0c5f9b66'
--   breadcrumb  survivor = 'd195510e-391f-45a5-a92b-d463a4427252' loser = '192d0c15-b177-4183-a968-a277c439c455'

BEGIN;

-- ── 1. Collapse + repoint pantry rows per merge group ──────────────────────
-- A user often holds BOTH the survivor row and a loser row (e.g. "сіль"→salt
-- and "salt"→loser-uuid). Repointing the loser straight to the survivor would
-- violate the unique (user_id, ingredient_id) index. So for each group we first
-- delete the redundant rows — keeping one row per user, preferring the survivor
-- id, else the oldest — then repoint whatever loser row survives (only fires
-- when the user had no survivor row, e.g. breadcrumb).

CREATE OR REPLACE FUNCTION _tmp_collapse_pantry(survivor text, ids text[])
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM pantry
  WHERE id IN (
    SELECT id FROM (
      SELECT id, row_number() OVER (
        PARTITION BY user_id
        ORDER BY (ingredient_id = survivor) DESC, added_at, id
      ) AS rn
      FROM pantry
      WHERE ingredient_id = ANY(ids)
    ) ranked
    WHERE rn > 1
  );

  UPDATE pantry SET ingredient_id = survivor
  WHERE ingredient_id = ANY(ids) AND ingredient_id <> survivor;
END;
$$;

SELECT _tmp_collapse_pantry('salt',
  ARRAY['salt', '1cc6de7e-2f79-40b1-92e9-639af3a6b1c0']);
SELECT _tmp_collapse_pantry('garlic',
  ARRAY['garlic', '25dd19f5-7d1c-4671-a860-bef4b634ab54']);
SELECT _tmp_collapse_pantry('butter',
  ARRAY['butter', 'ec9bcbfb-9f7f-4f0a-ba41-d64a0e48da40']);
SELECT _tmp_collapse_pantry('egg',
  ARRAY['egg', 'f982eadc-8e6b-4afb-8a4c-c33ded64f502',
        'b79cde77-83c2-4851-9fbd-6198810e175e']);
SELECT _tmp_collapse_pantry('ade1f14a-0ca8-4aa1-b986-136abf997a08',
  ARRAY['ade1f14a-0ca8-4aa1-b986-136abf997a08',
        '5fbe774d-7384-481d-86d6-56db17763dda']);
SELECT _tmp_collapse_pantry('b71bed24-7866-4932-a219-cbecebcfeee5',
  ARRAY['b71bed24-7866-4932-a219-cbecebcfeee5',
        '586bb4d9-e2ef-41af-82bb-cb3c0c5f9b66']);
SELECT _tmp_collapse_pantry('d195510e-391f-45a5-a92b-d463a4427252',
  ARRAY['d195510e-391f-45a5-a92b-d463a4427252',
        '192d0c15-b177-4183-a968-a277c439c455']);

DROP FUNCTION _tmp_collapse_pantry(text, text[]);

-- ── 2. Repoint recipes' canonical_ingredient_ids arrays ────────────────────
-- jsonb does not support array_replace; replace element-by-element.

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
    canonical_ingredient_ids, '1cc6de7e-2f79-40b1-92e9-639af3a6b1c0', 'salt')
  WHERE canonical_ingredient_ids @> '["1cc6de7e-2f79-40b1-92e9-639af3a6b1c0"]'::jsonb;

UPDATE recipes
  SET canonical_ingredient_ids = _tmp_replace_jsonb_id(
    canonical_ingredient_ids, '25dd19f5-7d1c-4671-a860-bef4b634ab54', 'garlic')
  WHERE canonical_ingredient_ids @> '["25dd19f5-7d1c-4671-a860-bef4b634ab54"]'::jsonb;

UPDATE recipes
  SET canonical_ingredient_ids = _tmp_replace_jsonb_id(
    canonical_ingredient_ids, 'ec9bcbfb-9f7f-4f0a-ba41-d64a0e48da40', 'butter')
  WHERE canonical_ingredient_ids @> '["ec9bcbfb-9f7f-4f0a-ba41-d64a0e48da40"]'::jsonb;

UPDATE recipes
  SET canonical_ingredient_ids = _tmp_replace_jsonb_id(
    canonical_ingredient_ids, 'f982eadc-8e6b-4afb-8a4c-c33ded64f502', 'egg')
  WHERE canonical_ingredient_ids @> '["f982eadc-8e6b-4afb-8a4c-c33ded64f502"]'::jsonb;

UPDATE recipes
  SET canonical_ingredient_ids = _tmp_replace_jsonb_id(
    canonical_ingredient_ids, 'b79cde77-83c2-4851-9fbd-6198810e175e', 'egg')
  WHERE canonical_ingredient_ids @> '["b79cde77-83c2-4851-9fbd-6198810e175e"]'::jsonb;

UPDATE recipes
  SET canonical_ingredient_ids = _tmp_replace_jsonb_id(
    canonical_ingredient_ids, '5fbe774d-7384-481d-86d6-56db17763dda',
    'ade1f14a-0ca8-4aa1-b986-136abf997a08')
  WHERE canonical_ingredient_ids @> '["5fbe774d-7384-481d-86d6-56db17763dda"]'::jsonb;

UPDATE recipes
  SET canonical_ingredient_ids = _tmp_replace_jsonb_id(
    canonical_ingredient_ids, '586bb4d9-e2ef-41af-82bb-cb3c0c5f9b66',
    'b71bed24-7866-4932-a219-cbecebcfeee5')
  WHERE canonical_ingredient_ids @> '["586bb4d9-e2ef-41af-82bb-cb3c0c5f9b66"]'::jsonb;

UPDATE recipes
  SET canonical_ingredient_ids = _tmp_replace_jsonb_id(
    canonical_ingredient_ids, '192d0c15-b177-4183-a968-a277c439c455',
    'd195510e-391f-45a5-a92b-d463a4427252')
  WHERE canonical_ingredient_ids @> '["192d0c15-b177-4183-a968-a277c439c455"]'::jsonb;

DROP FUNCTION _tmp_replace_jsonb_id;

-- ── 3. Delete the 8 loser rows ─────────────────────────────────────────────

DELETE FROM ingredients WHERE id IN (
  '1cc6de7e-2f79-40b1-92e9-639af3a6b1c0',  -- salt dupe
  '25dd19f5-7d1c-4671-a860-bef4b634ab54',  -- garlic dupe
  'ec9bcbfb-9f7f-4f0a-ba41-d64a0e48da40',  -- butter dupe
  'f982eadc-8e6b-4afb-8a4c-c33ded64f502',  -- egg dupe 1
  'b79cde77-83c2-4851-9fbd-6198810e175e',  -- egg dupe 2
  '5fbe774d-7384-481d-86d6-56db17763dda',  -- flour dupe
  '586bb4d9-e2ef-41af-82bb-cb3c0c5f9b66',  -- pepper/spice dupe
  '192d0c15-b177-4183-a968-a277c439c455'   -- breadcrumb dupe
);

-- ── 4. Verification queries ────────────────────────────────────────────────
-- Run these after committing to confirm clean state.

-- Should return 0 rows:
SELECT lower(trim(en)) AS en, count(*) AS cnt
FROM ingredients
WHERE status = 'confirmed'
GROUP BY 1
HAVING count(*) > 1
ORDER BY cnt DESC;

-- Should return 0 rows (no user holds the same ingredient twice):
SELECT user_id, ingredient_id, count(*) FROM pantry
WHERE ingredient_id IS NOT NULL
GROUP BY user_id, ingredient_id
HAVING count(*) > 1;

-- ── Change ROLLBACK → COMMIT once row counts are verified ─────────────────
ROLLBACK;
