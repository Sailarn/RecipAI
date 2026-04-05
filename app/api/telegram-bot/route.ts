import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { account } from "@/db/schema/auth";
import { parseJobs } from "@/db/schema/parse-jobs";
import { api } from "@/lib/routes";
import { extractUrl, sendTelegramMessage } from "@/lib/telegram-bot";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = body?.message;

  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const telegramId = String(message.from.id);
  const text = message.text ?? "";

  console.log("Looking for telegramId:", telegramId);
  const allTelegramAccounts = await db
    .select()
    .from(account)
    .where(eq(account.providerId, "telegram-oidc"));
  console.log("All telegram accounts:", JSON.stringify(allTelegramAccounts));

  // find user by telegramId
  const [foundAccount] = await db
    .select()
    .from(account)
    .where(
      and(
        eq(account.accountId, telegramId),
        eq(account.providerId, "telegram-oidc"),
      ),
    );

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
    status: "pending",
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
