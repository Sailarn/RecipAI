import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { parseJobs } from "@/db/schema/parse-jobs";
import { pushSubscriptions } from "@/db/schema/push-subscriptions";
import { recipes } from "@/db/schema/recipes";
import { ApiError } from "@/lib/api-errors";
import { PARSE_JOB_STATUS, type ParsedRecipe } from "@/lib/db/schema";
import { parseRecipeFromUrl } from "@/lib/parse-recipe";
import { sendTelegramMessage } from "@/lib/telegram-bot";
import { uploadImageServer } from "@/lib/upload/imagekit";
import { isImageKitUrl } from "@/lib/upload/images";
import { sendPushNotification } from "@/lib/web-push";
import { classifyParseError, parseWithRetry } from "./helpers";

export const maxDuration = 60;

// Push services return 404 Not Found or 410 Gone once a subscription endpoint
// has expired. Drop the dead row so we stop trying to reach it.
async function pruneExpiredSubscription(endpoint: string, pushError: unknown) {
  const statusCode =
    pushError && typeof pushError === "object" && "statusCode" in pushError
      ? (pushError as { statusCode?: number }).statusCode
      : undefined;
  if (statusCode !== 404 && statusCode !== 410) return;
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .catch(() => {});
}

// A job whose PROCESSING row is newer than this is treated as in-flight, so a
// replayed call won't kick off a second Gemini parse for the same job.
const IN_FLIGHT_SECONDS = 90;

export async function POST(req: NextRequest) {
  let body: { jobId?: string };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { jobId } = body;
  if (!jobId) return ApiError.badRequest("jobId required");

  const [job] = await db
    .select()
    .from(parseJobs)
    .where(eq(parseJobs.id, jobId));

  if (!job) return ApiError.notFound("Job not found");

  // Idempotency: never re-run Gemini for a job that's already done or actively
  // processing — bounds cost against replayed/duplicate process calls.
  const ageSeconds = (Date.now() - job.updatedAt.getTime()) / 1000;
  if (
    job.status === PARSE_JOB_STATUS.DONE ||
    (job.status === PARSE_JOB_STATUS.PROCESSING &&
      ageSeconds < IN_FLIGHT_SECONDS)
  ) {
    return NextResponse.json({ ok: true });
  }

  await db
    .update(parseJobs)
    .set({ status: PARSE_JOB_STATUS.PROCESSING, updatedAt: new Date() })
    .where(eq(parseJobs.id, jobId));

  try {
    const recipe = await parseWithRetry(
      parseRecipeFromUrl,
      job.url,
      job.userComment ?? undefined,
    );

    await db
      .update(parseJobs)
      .set({
        status: PARSE_JOB_STATUS.DONE,
        result: recipe as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(parseJobs.id, jobId));

    // send web push notification if the client subscribed
    if (job.pushEndpoint) {
      const [sub] = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, job.pushEndpoint));

      if (sub) {
        const parsedTitle = (recipe as ParsedRecipe).title;
        sendPushNotification(sub, {
          title: parsedTitle,
          body: "Your recipe is ready — tap to review",
          url: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "/",
        }).catch((pushError: unknown) =>
          pruneExpiredSubscription(sub.endpoint, pushError),
        );
      }
    }

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
        status: PARSE_JOB_STATUS.FAILED,
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
