import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { parseJobs } from "@/db/schema/parse-jobs";
import { recipes } from "@/db/schema/recipes";
import { ApiError } from "@/lib/api-errors";
import type { ParsedRecipe } from "@/lib/db/schema";
import { uploadImageServer } from "@/lib/imagekit";
import { isImageKitUrl } from "@/lib/images";
import { parseRecipeFromUrl } from "@/lib/parse-recipe";
import { sendTelegramMessage } from "@/lib/telegram-bot";
import { classifyParseError, parseWithRetry } from "./helpers";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { jobId?: string };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { jobId } = body;
  if (!jobId) return ApiError.badRequest("jobId required");

  await db
    .update(parseJobs)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(parseJobs.id, jobId));

  const [job] = await db
    .select()
    .from(parseJobs)
    .where(eq(parseJobs.id, jobId));

  if (!job) return ApiError.notFound("Job not found");

  try {
    const recipe = await parseWithRetry(
      parseRecipeFromUrl,
      job.url,
      job.userComment ?? undefined,
    );

    await db
      .update(parseJobs)
      .set({
        status: "done",
        result: recipe as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(parseJobs.id, jobId));

    // notify via Telegram if triggered from bot
    if (job.telegramChatId && job.userId) {
      const parsedRecipe = recipe as ParsedRecipe;

      let finalImageUrl = parsedRecipe.imageUrl ?? null;
      let finalImageFileId: string | null = null;
      if (finalImageUrl && !isImageKitUrl(finalImageUrl)) {
        try {
          const uploaded = await uploadImageServer(finalImageUrl);
          finalImageUrl = uploaded.url;
          finalImageFileId = uploaded.fileId;
        } catch {
          // keep original URL on failure
        }
      }

      await db.insert(recipes).values({
        id: crypto.randomUUID(),
        userId: job.userId,
        title: parsedRecipe.title,
        description: parsedRecipe.description ?? null,
        imageUrl: finalImageUrl,
        imageFileId: finalImageFileId,
        prepTime: parsedRecipe.prepTime ?? null,
        cookTime: parsedRecipe.cookTime ?? null,
        totalTime:
          parsedRecipe.prepTime && parsedRecipe.cookTime
            ? parsedRecipe.prepTime + parsedRecipe.cookTime
            : null,
        servings: parsedRecipe.servings ?? 1,
        ingredients: parsedRecipe.ingredients ?? [],
        instructions: parsedRecipe.instructions ?? [],
        sourceUrl: job.url,
        category: parsedRecipe.category ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const ingredientCount = parsedRecipe.ingredients?.length ?? 0;
      const stepCount = parsedRecipe.instructions?.length ?? 0;
      await sendTelegramMessage(
        job.telegramChatId,
        `✅ <b>${parsedRecipe.title}</b> saved to RecipAI!\n\n📦 ${ingredientCount} ingredients · 👨‍🍳 ${stepCount} steps`,
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    await db
      .update(parseJobs)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        updatedAt: new Date(),
      })
      .where(eq(parseJobs.id, jobId));

    if (job.telegramChatId) {
      await sendTelegramMessage(job.telegramChatId, classifyParseError(error));
    }

    return NextResponse.json({ ok: false });
  }
}
