import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { db } from "../db/index";
import { ingredients } from "../db/schema/ingredients";

const data = (await Bun.file("scripts/ingredients-seed.json").json()) as Array<{
  id: string;
  en: string;
  ua: string;
  category: string;
  aliasesEn: string[];
  aliasesUa: string[];
}>;

console.log(`Seeding ${data.length} ingredients to Supabase...`);

const BATCH = 50;
for (let i = 0; i < data.length; i += BATCH) {
  const batch = data.slice(i, i + BATCH);
  await db
    .insert(ingredients)
    .values(batch)
    .onConflictDoUpdate({
      target: ingredients.id,
      set: {
        en: sql`excluded.en`,
        ua: sql`excluded.ua`,
        category: sql`excluded.category`,
        aliasesEn: sql`excluded.aliases_en`,
        aliasesUa: sql`excluded.aliases_ua`,
        updatedAt: sql`now()`,
      },
    });
  console.log(
    `  ✓ Batch ${Math.floor(i / BATCH) + 1} / ${Math.ceil(data.length / BATCH)}`,
  );
}

console.log("Done! Seeded", data.length, "ingredients.");
process.exit(0);
