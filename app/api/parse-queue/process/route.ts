import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { parseJobs } from "@/db/schema/parse-jobs";
import { recipes } from "@/db/schema/recipes";
import { parseRecipeFromUrl } from "@/lib/parse-recipe";
import { sendTelegramMessage } from "@/lib/telegram-bot";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { jobId } = await req.json();

  if (!jobId)
    return NextResponse.json({ error: "jobId required" }, { status: 400 });

  await db
    .update(parseJobs)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(parseJobs.id, jobId));

  const [job] = await db
    .select()
    .from(parseJobs)
    .where(eq(parseJobs.id, jobId));

  if (!job)
    return NextResponse.json({ error: "Job not found" }, { status: 404 });

  try {
    const recipe = await parseRecipeFromUrl(
      job.url,
      job.userComment ?? undefined,
    );

    await db
      .update(parseJobs)
      .set({ status: "done", result: recipe as any, updatedAt: new Date() })
      .where(eq(parseJobs.id, jobId));

    // notify via Telegram if triggered from bot
    if (job.telegramChatId && job.userId) {
      const r = recipe as any;
      await db.insert(recipes).values({
        id: crypto.randomUUID(),
        userId: job.userId,
        title: r.title,
        description: r.description ?? null,
        imageUrl: r.imageUrl ?? null,
        imageFileId: null,
        prepTime: r.prepTime ?? null,
        cookTime: r.cookTime ?? null,
        totalTime: r.prepTime && r.cookTime ? r.prepTime + r.cookTime : null,
        servings: r.servings ?? 1,
        ingredients: r.ingredients ?? [],
        instructions: r.instructions ?? [],
        sourceUrl: job.url,
        category: r.category ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
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

    // notify failure via Telegram
    if (job.telegramChatId) {
      await sendTelegramMessage(
        job.telegramChatId,
        `❌ Failed to parse recipe from:\n${job.url}\n\nTry again or open RecipAI to parse manually.`,
      );
    }

    return NextResponse.json({ ok: false });
  }
}
