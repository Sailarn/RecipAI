import { inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { account } from "@/db/schema/auth";
import { parseJobs } from "@/db/schema/parse-jobs";
import { ApiError } from "@/lib/api-errors";
import { PARSE_JOB_STATUS } from "@/lib/db/schema";
import { normalizeSourceUrl } from "@/lib/parse-recipe/normalize-url";
import { api } from "@/lib/routes";
import { extractUrl, sendTelegramMessage } from "@/lib/telegram-bot";

type TelegramAccount = typeof account.$inferSelect;

const WEBHOOK_SECRET_HEADER = "x-telegram-bot-api-secret-token";

function isAuthenticTelegramRequest(req: NextRequest): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return true;
  return req.headers.get(WEBHOOK_SECRET_HEADER) === expected;
}

// Both Telegram sign-in paths store the Telegram user id, but differently:
// Mini App accounts (providerId "telegram") set `accountId` to the id directly,
// while OIDC accounts ("telegram-oidc") carry it as the `sub` claim of the
// id token. Match either so the bot reaches users from both entry points.
function accountMatchesTelegramId(
  candidate: TelegramAccount,
  telegramId: string,
): boolean {
  if (candidate.accountId === telegramId) return true;
  if (!candidate.idToken) return false;
  try {
    const payload = JSON.parse(
      Buffer.from(candidate.idToken.split(".")[1], "base64url").toString(),
    );
    return (
      String(payload.sub) === telegramId || String(payload.id) === telegramId
    );
  } catch {
    return false;
  }
}

async function findLinkedAccount(
  telegramId: string,
): Promise<TelegramAccount | undefined> {
  const telegramAccounts = await db
    .select()
    .from(account)
    .where(inArray(account.providerId, ["telegram-oidc", "telegram"]));
  return telegramAccounts.find((candidate) =>
    accountMatchesTelegramId(candidate, telegramId),
  );
}

async function enqueueParseJob(
  url: string,
  userId: string,
  chatId: number | string,
): Promise<void> {
  const jobId = crypto.randomUUID();
  await db.insert(parseJobs).values({
    id: jobId,
    userId,
    url,
    normalizedUrl: normalizeSourceUrl(url),
    telegramChatId: String(chatId),
    status: PARSE_JOB_STATUS.PENDING,
  });

  // Fire-and-forget: a failure would leave the user stuck on "Parsing…", so capture it.
  fetch(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}${api.parseQueueProcess}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId }),
  }).catch((error) => ApiError.capture(error));
}

export async function POST(req: NextRequest) {
  if (!isAuthenticTelegramRequest(req)) return ApiError.unauthorized();

  let body: {
    message?: {
      chat: { id: number };
      from: { id: number; first_name?: string };
      text?: string;
    };
  };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  const message = body?.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const telegramId = String(message.from.id);
  const text = message.text ?? "";

  const linkedAccount = await findLinkedAccount(telegramId);
  if (!linkedAccount) {
    await sendTelegramMessage(
      chatId,
      "👋 Link your Telegram account in RecipAI first, then send me any recipe URL.",
    );
    return NextResponse.json({ ok: true });
  }

  if (text.startsWith("/start")) {
    const firstName = message.from.first_name ?? "there";
    await sendTelegramMessage(
      chatId,
      `👋 Hi ${firstName}! Send me any recipe URL or supported social post and I'll save it to your RecipAI account.`,
    );
    return NextResponse.json({ ok: true });
  }

  const url = extractUrl(text);
  if (!url) {
    await sendTelegramMessage(
      chatId,
      "Send me a recipe URL or supported social post link and I'll parse it for you.",
    );
    return NextResponse.json({ ok: true });
  }

  await enqueueParseJob(url, linkedAccount.userId, chatId);

  await sendTelegramMessage(
    chatId,
    `⏳ Parsing recipe from:\n${url}\n\nI'll let you know when it's ready.`,
  );

  return NextResponse.json({ ok: true });
}
