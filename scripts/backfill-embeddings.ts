import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { pipeline } from "@huggingface/transformers";
import { eq, isNull } from "drizzle-orm";
import { db } from "../db/index";
import { ingredients } from "../db/schema/ingredients";

// One-time backfill: compute the `passage:` embedding for every confirmed
// vocabulary row that doesn't have one yet, and write it to the DB. This is
// purely mechanical (deterministic e5, no AI) — required so pre-existing rows
// gain vectors, since clients only ever embed entries they enrich themselves.
// Run with: bun scripts/backfill-embeddings.ts

const rows = await db
  .select({ id: ingredients.id, en: ingredients.en })
  .from(ingredients)
  .where(isNull(ingredients.embedding));

console.log(`${rows.length} ingredients missing an embedding.`);
if (rows.length === 0) {
  console.log("Nothing to backfill.");
  process.exit(0);
}

console.log("Loading Xenova/multilingual-e5-small...");
const extractor = await pipeline(
  "feature-extraction",
  "Xenova/multilingual-e5-small",
);
console.log("Model loaded. Computing embeddings...");

let done = 0;
for (const row of rows) {
  const output = await extractor(`passage: ${row.en}`, {
    pooling: "mean",
    normalize: true,
  });
  const embedding = Array.from(output.data as Float32Array);

  await db
    .update(ingredients)
    .set({ embedding })
    .where(eq(ingredients.id, row.id));

  done += 1;
  if (done % 50 === 0 || done === rows.length) {
    console.log(`  ${done}/${rows.length}`);
  }
}

console.log(`Done! Backfilled ${done} embeddings.`);
process.exit(0);
