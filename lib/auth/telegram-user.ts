import type { TelegramMiniAppUser } from "better-auth-telegram";

/**
 * Map a Telegram Mini App user to a better-auth user record.
 *
 * Telegram provides no email, but our `user` table requires one (NOT NULL,
 * unique). The plugin's default mapper leaves email undefined, so a brand-new
 * Mini App user fails to insert and auto sign-in never completes. Synthesize a
 * stable placeholder keyed by the Telegram id — mirroring the OIDC path's
 * placeholder. The same person arriving via OIDC is still de-duplicated by
 * `telegramId` (not email), so the two placeholder domains never collide on one
 * account.
 */
export function miniAppDataToUser(data: TelegramMiniAppUser): {
  name: string;
  email: string;
  image?: string;
} {
  return {
    name: data.last_name
      ? `${data.first_name} ${data.last_name}`
      : data.first_name,
    image: data.photo_url,
    email: `${data.id}@telegram.miniapp`,
  };
}
