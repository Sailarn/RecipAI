import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { db } from "../db/index";

// Merge duplicate ingredient rows that share the same English name.
//
// Provisional rows minted per-device (UUID ids) can collide with an existing
// seeded entry (slug id) or with each other, leaving redundant vocabulary rows
// with identical en/ua. This script folds each duplicate group down to one
// canonical row, repointing every reference (pantry.ingredient_id and
// recipes.canonical_ingredient_ids) before deleting the extras.
//
// Dry-run by default — prints the plan and changes nothing.
// Pass --apply to execute the merge inside a single transaction.
//
//   bun scripts/dedup-ingredients.ts            # preview
//   bun scripts/dedup-ingredients.ts --apply    # commit

const apply = process.argv.includes("--apply");

interface IngredientRow {
  id: string;
  en: string;
  ua: string | null;
  category: string;
  aliasesEn: string[];
  aliasesUa: string[];
  createdAt: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
const isSlug = (id: string) => !UUID_PATTERN.test(id);
const normalizeKey = (en: string) => en.trim().toLowerCase();

function unionLower(...lists: (string[] | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const list of lists) {
    for (const value of list ?? []) {
      const key = value.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(value.trim());
    }
  }
  return result;
}

async function referenceCounts(id: string) {
  const pantryRows = await db.execute<{ count: number }>(
    sql`SELECT count(*)::int AS count FROM pantry WHERE ingredient_id = ${id}`,
  );
  const recipeRows = await db.execute<{ count: number }>(
    sql`SELECT count(*)::int AS count FROM recipes WHERE canonical_ingredient_ids ? ${id}`,
  );
  return {
    pantry: pantryRows[0]?.count ?? 0,
    recipes: recipeRows[0]?.count ?? 0,
  };
}

const rows = await db.execute<IngredientRow>(sql`
  SELECT id, en, ua, category,
         aliases_en AS "aliasesEn", aliases_ua AS "aliasesUa",
         created_at AS "createdAt"
  FROM ingredients
`);

const groups = new Map<string, IngredientRow[]>();
for (const row of rows) {
  const key = normalizeKey(row.en);
  const bucket = groups.get(key);
  if (bucket) bucket.push(row);
  else groups.set(key, [row]);
}

const duplicateGroups = [...groups.values()].filter(
  (bucket) => bucket.length > 1,
);

if (duplicateGroups.length === 0) {
  console.log("No duplicate ingredient groups found. Nothing to do.");
  process.exit(0);
}

console.log(
  `${apply ? "APPLYING" : "DRY RUN"} — ${duplicateGroups.length} duplicate group(s) found.\n`,
);

interface MergePlan {
  canonical: IngredientRow;
  duplicates: IngredientRow[];
  mergedAliasesEn: string[];
  mergedAliasesUa: string[];
}

const plans: MergePlan[] = [];

for (const bucket of duplicateGroups) {
  const withCounts = await Promise.all(
    bucket.map(async (row) => ({ row, refs: await referenceCounts(row.id) })),
  );

  // Canonical = the seeded slug if present, otherwise the most-referenced row.
  // Tie-break on the oldest createdAt so the choice is deterministic.
  const canonicalEntry = [...withCounts].sort((left, right) => {
    const leftSlug = isSlug(left.row.id) ? 1 : 0;
    const rightSlug = isSlug(right.row.id) ? 1 : 0;
    if (leftSlug !== rightSlug) return rightSlug - leftSlug;

    const leftRefs = left.refs.pantry + left.refs.recipes;
    const rightRefs = right.refs.pantry + right.refs.recipes;
    if (leftRefs !== rightRefs) return rightRefs - leftRefs;

    return left.row.createdAt.localeCompare(right.row.createdAt);
  })[0];

  const canonical = canonicalEntry.row;
  const duplicates = withCounts
    .filter((entry) => entry.row.id !== canonical.id)
    .map((entry) => entry.row);

  const mergedAliasesEn = unionLower(
    canonical.aliasesEn,
    ...duplicates.map((dup) => dup.aliasesEn),
    ...duplicates.map((dup) => [dup.en]),
  ).filter((alias) => alias.toLowerCase() !== canonical.en.toLowerCase());

  const mergedAliasesUa = unionLower(
    canonical.aliasesUa,
    ...duplicates.map((dup) => dup.aliasesUa),
    ...duplicates.map((dup) => (dup.ua ? [dup.ua] : [])),
  ).filter(
    (alias) => alias.toLowerCase() !== (canonical.ua ?? "").toLowerCase(),
  );

  plans.push({ canonical, duplicates, mergedAliasesEn, mergedAliasesUa });

  console.log(`"${canonical.en}"`);
  console.log(
    `  keep   ${canonical.id}${isSlug(canonical.id) ? " (slug)" : ""}`,
  );
  for (const entry of withCounts) {
    if (entry.row.id === canonical.id) continue;
    console.log(
      `  merge  ${entry.row.id} → refs: ${entry.refs.recipes} recipe, ${entry.refs.pantry} pantry`,
    );
  }
  console.log("");
}

if (!apply) {
  console.log("Dry run complete. Re-run with --apply to commit.");
  process.exit(0);
}

await db.transaction(async (tx) => {
  for (const plan of plans) {
    const { canonical, duplicates, mergedAliasesEn, mergedAliasesUa } = plan;

    await tx.execute(sql`
      UPDATE ingredients
      SET aliases_en = ${JSON.stringify(mergedAliasesEn)}::jsonb,
          aliases_ua = ${JSON.stringify(mergedAliasesUa)}::jsonb,
          updated_at = now()
      WHERE id = ${canonical.id}
    `);

    for (const dup of duplicates) {
      await tx.execute(sql`
        UPDATE pantry SET ingredient_id = ${canonical.id}
        WHERE ingredient_id = ${dup.id}
      `);

      await tx.execute(sql`
        UPDATE recipes
        SET canonical_ingredient_ids = (
          SELECT jsonb_agg(DISTINCT remapped)
          FROM jsonb_array_elements_text(canonical_ingredient_ids) AS original,
          LATERAL (
            SELECT CASE WHEN original = ${dup.id} THEN ${canonical.id} ELSE original END
          ) AS mapped(remapped)
        )
        WHERE canonical_ingredient_ids ? ${dup.id}
      `);

      await tx.execute(sql`DELETE FROM ingredients WHERE id = ${dup.id}`);
    }
  }
});

const removed = plans.reduce((sum, plan) => sum + plan.duplicates.length, 0);
console.log(
  `Done — merged ${plans.length} group(s), removed ${removed} duplicate row(s).`,
);
process.exit(0);
