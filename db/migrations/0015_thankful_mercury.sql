-- Collapse any pre-existing duplicate pantry rows for the same
-- (user_id, ingredient_id) before enforcing uniqueness. Keep the
-- earliest-added row (tiebreak on id); pantry rows aren't referenced
-- elsewhere, so the extras can simply be deleted.
DELETE FROM "pantry" a
USING "pantry" b
WHERE a."user_id" = b."user_id"
  AND a."ingredient_id" = b."ingredient_id"
  AND a."ingredient_id" IS NOT NULL
  AND (
    a."added_at" > b."added_at"
    OR (a."added_at" = b."added_at" AND a."id" > b."id")
  );
--> statement-breakpoint
CREATE UNIQUE INDEX "pantry_user_ingredient_uniq" ON "pantry" USING btree ("user_id","ingredient_id") WHERE "pantry"."ingredient_id" IS NOT NULL;
