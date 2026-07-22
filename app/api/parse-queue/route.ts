import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { parseJobs } from "@/db/schema/parse-jobs";
import { ApiError } from "@/lib/api-errors";
import { auth } from "@/lib/auth/auth";
import { requireSession } from "@/lib/auth/require-session";
import { PARSE_JOB_STATUS, type ParsedRecipe } from "@/lib/db/schema";
import { normalizeSourceUrl } from "@/lib/parse-recipe/normalize-url";
import { PARSER_VERSION } from "@/lib/parse-recipe/parser-version";
import { saveParsedRecipeForUser } from "@/lib/parse-recipe/save-parsed-recipe-server";
import { enforceParseRateLimit } from "@/lib/rate-limit";
import { api } from "@/lib/routes";
import { resolveTelegramChatId } from "@/lib/telegram/account";
import { mintUploadToken } from "@/lib/upload/upload-token";

// Kick the parse worker off server-side (fire-and-forget) so a Telegram-notify
// parse still completes and messages the user even if the client navigates away
// right after enqueuing. Mirrors the trigger in the telegram-bot webhook.
function triggerParseProcess(jobId: string): void {
  fetch(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}${api.parseQueueProcess}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId }),
  }).catch((error) => ApiError.capture(error));
}

export async function GET(req: NextRequest) {
  const authed = await requireSession();
  if (authed.response) return authed.response;

  try {
    const jobs = await db
      .select({
        id: parseJobs.id,
        url: parseJobs.url,
        status: parseJobs.status,
        result: parseJobs.result,
        error: parseJobs.error,
        createdAt: parseJobs.createdAt,
      })
      .from(parseJobs)
      .where(eq(parseJobs.userId, authed.session.user.id))
      .orderBy(desc(parseJobs.createdAt))
      .limit(100);

    return NextResponse.json({ jobs });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  const limited = await enforceParseRateLimit(req, session?.user.id);
  if (limited) return limited;

  let body: {
    url?: string;
    pushEndpoint?: string;
    telegramNotify?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { url, pushEndpoint, telegramNotify } = body;
  if (!url) return ApiError.badRequest("URL required");

  const id = crypto.randomUUID();
  const normalizedUrl = normalizeSourceUrl(url);

  try {
    // Resolve which Telegram chat to notify on completion. Only when the client
    // asked (Mini App / Telegram-connected user with the toggle on) *and* the
    // user actually has a linked Telegram account — otherwise the parse falls
    // back to the normal in-app review flow.
    const telegramChatId =
      telegramNotify && session?.user.id
        ? await resolveTelegramChatId(session.user.id)
        : null;

    // Mint the upload token first. It depends on Redis; minting *after* the
    // insert means a Redis failure leaves an orphaned PENDING job the client
    // never processes (it got an error and never called /process). Token-first
    // keeps the enqueue atomic — a mint failure inserts nothing.
    const uploadToken = await mintUploadToken();

    // Result cache: if this URL was already parsed by the current pipeline,
    // clone the stored result into a DONE job instead of re-running Gemini.
    // The client flow is unchanged — its poll sees DONE immediately, and the
    // fire-and-forget /process call no-ops on an already-done job.
    const [cached] = await db
      .select({ result: parseJobs.result })
      .from(parseJobs)
      .where(
        and(
          eq(parseJobs.normalizedUrl, normalizedUrl),
          eq(parseJobs.status, PARSE_JOB_STATUS.DONE),
          eq(parseJobs.parserVersion, PARSER_VERSION),
          isNotNull(parseJobs.result),
          // A complete recipe needs both ingredients and instructions.
          sql`(
            jsonb_array_length(coalesce(${parseJobs.result} -> 'ingredients', '[]'::jsonb)) > 0
            AND jsonb_array_length(coalesce(${parseJobs.result} -> 'instructions', '[]'::jsonb)) > 0
          )`,
        ),
      )
      .orderBy(desc(parseJobs.createdAt))
      .limit(1);

    await db.insert(parseJobs).values({
      id,
      userId: session?.user.id || null,
      url,
      normalizedUrl,
      pushEndpoint: pushEndpoint ?? null,
      telegramChatId,
      ...(cached
        ? {
            status: PARSE_JOB_STATUS.DONE,
            result: cached.result,
            parserVersion: PARSER_VERSION,
          }
        : { status: PARSE_JOB_STATUS.PENDING }),
    });

    // A Telegram-notify parse skips the in-app review flow, so the recipe is
    // saved server-side. A cache hit is already DONE (so /process no-ops) — save
    // it right here. Otherwise kick /process off server-side so it saves and
    // sends the bot message on completion, even if the client navigates away.
    if (telegramChatId && session?.user.id) {
      if (cached) {
        await saveParsedRecipeForUser({
          userId: session.user.id,
          parsed: cached.result as unknown as ParsedRecipe,
          sourceUrl: url,
        });
      } else {
        triggerParseProcess(id);
      }
    }

    return NextResponse.json({
      jobId: id,
      uploadToken,
      cached: Boolean(cached),
      telegramNotify: Boolean(telegramChatId),
      ...(cached ? { result: cached.result } : {}),
    });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
