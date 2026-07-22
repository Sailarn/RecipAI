import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { account, user } from "@/db/schema/auth";

type TelegramAccount = typeof account.$inferSelect;

// A Telegram account stores the user's Telegram id differently per sign-in path:
// Mini App / login-widget accounts (providerId "telegram") put it in `accountId`
// and mirror it in `telegramId`; OIDC accounts ("telegram-oidc") carry it as the
// `sub`/`id` claim of the id token. Return whichever is present.
export function telegramIdFromAccount(
  candidate: TelegramAccount,
): string | null {
  if (candidate.telegramId) return candidate.telegramId;
  if (candidate.providerId === "telegram") return candidate.accountId;
  if (!candidate.idToken) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(candidate.idToken.split(".")[1], "base64url").toString(),
    );
    const claim = payload.sub ?? payload.id;
    return claim ? String(claim) : null;
  } catch {
    return null;
  }
}

// The private-chat id the bot can message equals the user's Telegram id. Prefer
// the mirrored column on `user` (set on Mini App / widget sign-in); fall back to
// the linked account for OIDC users, whose id lives in the id token. Returns
// null when the user has no Telegram connection at all.
export async function resolveTelegramChatId(
  userId: string,
): Promise<string | null> {
  const [userRow] = await db
    .select({ telegramId: user.telegramId })
    .from(user)
    .where(eq(user.id, userId));
  if (userRow?.telegramId) return userRow.telegramId;

  const accounts = await db
    .select()
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        inArray(account.providerId, ["telegram", "telegram-oidc"]),
      ),
    );
  for (const candidate of accounts) {
    const telegramId = telegramIdFromAccount(candidate);
    if (telegramId) return telegramId;
  }
  return null;
}
