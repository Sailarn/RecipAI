import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { parseJobs } from "@/db/schema/parse-jobs";
import { pushSubscriptions } from "@/db/schema/push-subscriptions";
import { ApiError } from "@/lib/api-errors";
import { PARSE_JOB_STATUS, type ParsedRecipe } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { parseRecipeFromUrl } from "@/lib/parse-recipe";
import { PARSER_VERSION } from "@/lib/parse-recipe/parser-version";
import { requireCompleteRecipe } from "@/lib/parse-recipe/recipe-result";
import { saveParsedRecipeForUser } from "@/lib/parse-recipe/save-parsed-recipe-server";
import {
  type RecipeCardData,
  recipeCardButton,
  recipeCardCaption,
  telegramPhotoUrl,
} from "@/lib/telegram/recipe-card";
import { sendTelegramMessage, sendTelegramPhoto } from "@/lib/telegram-bot";
import { uploadImageServer } from "@/lib/upload/imagekit";
import { isImageKitUrl } from "@/lib/upload/images";
import { type PushPayload, sendPushNotification } from "@/lib/web-push";
import { classifyParseError, parseWithRetry } from "./helpers";

export const maxDuration = 60;

function pushErrorStatus(pushError: unknown): number | undefined {
  return pushError && typeof pushError === "object" && "statusCode" in pushError
    ? (pushError as { statusCode?: number }).statusCode
    : undefined;
}

// Decide what to do with a failed web-push send instead of swallowing it.
// Expired endpoints (404/410) are pruned. Auth/VAPID failures (401/403) are
// captured to Sentry — they silently break push for *every* user until the keys
// are fixed, so they must be visible. Anything else is logged, so transient 5xx
// leave a trace without spamming Sentry.
async function handlePushFailure(
  endpoint: string,
  pushError: unknown,
  req: NextRequest,
): Promise<void> {
  const statusCode = pushErrorStatus(pushError);
  if (statusCode === 404 || statusCode === 410) {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .catch(() => {});
    return;
  }
  if (statusCode === 401 || statusCode === 403) {
    ApiError.capture(pushError, req);
    return;
  }
  logger.error("Push send failed", pushError);
}

// A job whose PROCESSING row is newer than this is treated as in-flight, so a
// replayed call won't kick off a second Gemini parse for the same job.
const IN_FLIGHT_SECONDS = 90;

interface ParseJobPushSource {
  userId: string | null;
  pushEndpoint: string | null;
}

interface NotifyParseJobSubscribersOptions {
  job: ParseJobPushSource;
  payload: PushPayload;
  req: NextRequest;
}

async function notifyParseJobSubscribers({
  job,
  payload,
  req,
}: NotifyParseJobSubscribersOptions): Promise<void> {
  if (!job.pushEndpoint) return;

  const targets = job.userId
    ? await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, job.userId))
    : await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, job.pushEndpoint));

  for (const target of targets) {
    sendPushNotification(target, payload).catch((pushError: unknown) =>
      handlePushFailure(target.endpoint, pushError, req),
    );
  }
}

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

  const jobUrl = job.url;
  if (!jobUrl) return ApiError.badRequest("URL job required");

  await db
    .update(parseJobs)
    .set({ status: PARSE_JOB_STATUS.PROCESSING, updatedAt: new Date() })
    .where(eq(parseJobs.id, jobId));

  try {
    const recipe = requireCompleteRecipe(
      await parseWithRetry(parseRecipeFromUrl, jobUrl),
      "page",
      { jobId, url: jobUrl },
    );

    // Persist the recipe image to ImageKit while the source URL is still fresh,
    // so the stored result — and therefore the result cache — holds a stable
    // URL. Source CDN URLs (Instagram's especially) expire within hours, which
    // is why a second, cached parse otherwise rendered a broken image. Runs
    // server-side, so anonymous parses get a durable image too. Best-effort:
    // keep the source URL if the upload fails.
    let imageUrl = recipe.imageUrl;
    let imageFileId = recipe.imageFileId;
    if (imageUrl && !isImageKitUrl(imageUrl)) {
      try {
        const uploaded = await uploadImageServer(imageUrl);
        imageUrl = uploaded.url;
        imageFileId = uploaded.fileId;
      } catch (uploadError) {
        // Best-effort: keep the source URL so the parse still completes. But a
        // silently-swallowed failure means the recipe stores an *expiring*
        // Instagram CDN URL that breaks within hours — so surface it instead of
        // hiding it. (See imageFetchHeaders for the usual 403 cause.)
        ApiError.capture(uploadError, req);
      }
    }
    const finalRecipe: ParsedRecipe = { ...recipe, imageUrl, imageFileId };

    await db
      .update(parseJobs)
      .set({
        status: PARSE_JOB_STATUS.DONE,
        result: finalRecipe as unknown as Record<string, unknown>,
        parserVersion: PARSER_VERSION,
        updatedAt: new Date(),
      })
      .where(eq(parseJobs.id, jobId));

    // Notify via web push if the client opted in when enqueuing. For a signed-in
    // job we resolve every current subscription by userId at send time — so a
    // device that subscribed after (or instead of) the enqueue-time endpoint
    // still gets the push; anonymous jobs fall back to the single enqueue-time
    // endpoint. Expired endpoints are pruned per-send by handlePushFailure.
    await notifyParseJobSubscribers({
      job,
      req,
      payload: {
        title: finalRecipe.title,
        body: "Your recipe is ready — tap to review",
        url: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "/",
      },
    });

    // Notify via Telegram when the job carries a chat id — both the bot flow and
    // an in-app Mini-App parse with "Telegram notifications" on. Both skip the
    // in-app review step, so the recipe is saved server-side here and the bot
    // message deep-links straight to it.
    if (job.telegramChatId && job.userId) {
      const recipeId = await saveParsedRecipeForUser({
        userId: job.userId,
        parsed: finalRecipe,
        sourceUrl: jobUrl,
      });

      const cardData: RecipeCardData = {
        id: recipeId,
        title: finalRecipe.title,
        category: finalRecipe.category ?? null,
        totalTime:
          (finalRecipe.prepTime || 0) + (finalRecipe.cookTime || 0) || null,
        servings: finalRecipe.servings ?? 1,
        ingredientCount: finalRecipe.ingredients?.length ?? 0,
        imageUrl: finalRecipe.imageUrl ?? null,
      };
      const caption = recipeCardCaption(cardData, "✅ Saved to RecipAI");
      const replyMarkup = recipeCardButton(recipeId);

      // The recipe is already saved at this point, so a failure here is a
      // notification-delivery problem, not a parse failure — it must not fall
      // into the outer catch, which would mark the job FAILED and tell the
      // user parsing failed when it didn't. A non-ImageKit imageUrl means the
      // upload above failed and this is the (possibly now-expired/403) source
      // CDN URL, which Telegram often can't fetch either — skip straight to
      // text in that case instead of making a call likely to fail.
      try {
        if (cardData.imageUrl && isImageKitUrl(cardData.imageUrl)) {
          await sendTelegramPhoto(
            job.telegramChatId,
            telegramPhotoUrl(cardData.imageUrl),
            caption,
            replyMarkup,
          );
        } else {
          await sendTelegramMessage(job.telegramChatId, caption, replyMarkup);
        }
      } catch (notifyError) {
        ApiError.capture(notifyError, req);
      }
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

    await notifyParseJobSubscribers({
      job,
      req,
      payload: {
        title: "Recipe parse failed",
        body: classifyParseError(error),
        url: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "/",
      },
    });

    return NextResponse.json({ ok: false });
  }
}
