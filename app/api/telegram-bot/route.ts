import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { account } from "@/db/schema/auth";
import { parseJobs } from "@/db/schema/parse-jobs";
import { PARSE_JOB_STATUS } from "@/lib/db/schema";
import { api } from "@/lib/routes";
import { extractUrl, sendTelegramMessage } from "@/lib/telegram-bot";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = body?.message;

  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const telegramId = String(message.from.id);
  const text = message.text ?? "";

  const allTelegramAccounts = await db
    .select()
    .from(account)
    .where(eq(account.providerId, "telegram-oidc"));

  // find user by telegramId
  const foundAccount = allTelegramAccounts.find((acc) => {
    if (!acc.idToken) return false;
    try {
      const payload = JSON.parse(
        Buffer.from(acc.idToken.split(".")[1], "base64url").toString(),
      );
      return (
        String(payload.sub) === telegramId || String(payload.id) === telegramId
      );
    } catch {
      return false;
    }
  });

  if (!foundAccount) {
    await sendTelegramMessage(
      chatId,
      "👋 Link your Telegram account in RecipAI first, then send me any recipe URL.",
    );
    return NextResponse.json({ ok: true });
  }

  // handle /start command
  if (text.startsWith("/start")) {
    await sendTelegramMessage(
      chatId,
      `👋 Hi ${foundAccount.userId}! Send me any recipe URL or Instagram Reel and I'll save it to your RecipAI account.`,
    );
    return NextResponse.json({ ok: true });
  }

  // extract URL from message
  const url = extractUrl(text);
  if (!url) {
    await sendTelegramMessage(
      chatId,
      "Send me a recipe URL or Instagram Reel link and I'll parse it for you.",
    );
    return NextResponse.json({ ok: true });
  }

  // create parse job
  const jobId = crypto.randomUUID();
  await db.insert(parseJobs).values({
    id: jobId,
    userId: foundAccount.userId,
    url,
    telegramChatId: String(chatId),
    status: PARSE_JOB_STATUS.PENDING,
  });

  // trigger processing (fire and forget)
  fetch(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}${api.parseQueueProcess}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId }),
  }).catch(() => {});

  await sendTelegramMessage(
    chatId,
    `⏳ Parsing recipe from:\n${url}\n\nI'll let you know when it's ready.`,
  );

  return NextResponse.json({ ok: true });
}
