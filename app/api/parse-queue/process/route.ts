import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { parseJobs } from "@/db/schema/parse-jobs";
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
    if (job.telegramChatId) {
      const name = recipe.title ?? "Recipe";
      const ingredients = recipe.ingredients?.length ?? 0;
      const steps = recipe.instructions?.length ?? 0;
      await sendTelegramMessage(
        job.telegramChatId,
        `✅ <b>${name}</b> saved to RecipAI!\n\n📦 ${ingredients} ingredients · 👨‍🍳 ${steps} steps`,
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
