import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { parseJobs } from "@/db/schema/parse-jobs";
import { recipes } from "@/db/schema/recipes";
import type { UploadCaller } from "@/lib/upload/upload-auth";

/**
 * For files uploaded before owner tags existed: true when the file is still in
 * use by someone other than the caller — a cached parse result (shared by every
 * user who imports that link) or another user's recipe. The caller's own
 * recipe row may already be gone: a recipe delete reaches the server before its
 * image is discarded at the end of the undo window.
 */
export async function isImageInUseByOthers(
  fileId: string,
  caller: UploadCaller,
): Promise<boolean> {
  const [cachedParse] = await db
    .select({ id: parseJobs.id })
    .from(parseJobs)
    .where(sql`${parseJobs.result} ->> 'imageFileId' = ${fileId}`)
    .limit(1);
  if (cachedParse) return true;

  const sameFile = eq(recipes.imageFileId, fileId);
  const [otherRecipe] = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(
      "userId" in caller
        ? and(sameFile, ne(recipes.userId, caller.userId))
        : sameFile,
    )
    .limit(1);
  return Boolean(otherRecipe);
}
