import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { recipes } from "@/db/schema/recipes";
import { uploadImageServer } from "@/lib/imagekit";

const IMAGEKIT_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "";

async function main() {
  if (!IMAGEKIT_ENDPOINT) {
    console.error("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT is not set");
    process.exit(1);
  }

  const rows = await db
    .select({ id: recipes.id, imageUrl: recipes.imageUrl })
    .from(recipes)
    .where(isNotNull(recipes.imageUrl));

  const candidates = rows.filter(
    (r) => r.imageUrl && !r.imageUrl.startsWith(IMAGEKIT_ENDPOINT),
  ) as { id: string; imageUrl: string }[];

  console.log(`Found ${candidates.length} recipes with non-ImageKit images`);

  let updated = 0;
  let failed = 0;

  for (const row of candidates) {
    try {
      const uploaded = await uploadImageServer(row.imageUrl);
      await db
        .update(recipes)
        .set({ imageUrl: uploaded.url, imageFileId: uploaded.fileId, updatedAt: new Date() })
        .where(eq(recipes.id, row.id));
      console.log(`✅ ${row.id}: ${row.imageUrl} → ${uploaded.url}`);
      updated++;
    } catch (err) {
      console.error(`❌ ${row.id}: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
