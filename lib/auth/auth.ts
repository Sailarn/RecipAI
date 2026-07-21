import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { deviceAuthorization } from "better-auth/plugins";
import { telegram } from "better-auth-telegram";
import { db } from "@/db";
import * as schema from "@/db/schema/auth";
import {
  getAllowedAuthHosts,
  getExternalAuthUrl,
  validatePwaClient,
} from "@/lib/auth/external-auth-config";
import { externalLink } from "@/lib/auth/external-link-plugin";
import { miniAppDataToUser } from "@/lib/auth/telegram-user";

const authEnvironment =
  process.env.NODE_ENV === "production" ? "production" : "development";
const externalAuthUrl = getExternalAuthUrl({
  configuredUrl: process.env.NEXT_PUBLIC_EXTERNAL_AUTH_URL,
});

export const auth = betterAuth({
  baseURL: {
    allowedHosts: getAllowedAuthHosts(
      authEnvironment,
      process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    ),
    fallback: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    protocol: "auto",
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: true,
      trustedProviders: [
        "google",
        "telegram-oidc",
        "telegram",
        "telegram_oidc",
      ],
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  rateLimit: {
    enabled: true,
    customRules: {
      "/device/code": { window: 60, max: 10 },
      "/device/token": { window: 60, max: 20 },
      "/external-link/generate": { window: 60, max: 20 },
      "/external-link/redeem": { window: 60, max: 10 },
      "/external-link/device-session": { window: 60, max: 20 },
      "/telegram/miniapp/signin": { window: 60, max: 10 },
    },
  },
  plugins: [
    deviceAuthorization({
      expiresIn: "5m",
      interval: "5s",
      verificationUri: `${externalAuthUrl}/external-auth/device`,
      validateClient: validatePwaClient,
    }),
    externalLink(),
    passkey(),
    telegram({
      miniApp: {
        // Mini App sign-in: the WebView launches with a signed `initData`
        // payload which the plugin validates (HMAC-SHA256 with the bot token)
        // before issuing a session. See specs/telegram-mini-app.md.
        enabled: true,
        validateInitData: true,
        allowAutoSignin: true,
        // The plugin's default mapper leaves email undefined; our `user.email`
        // is NOT NULL, so a brand-new Mini App user (whose first touch is the
        // Mini App, not web/OIDC) fails to insert and auto sign-in never
        // completes. Supply a placeholder email so the user is created.
        mapMiniAppDataToUser: miniAppDataToUser,
      },
      botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
      botUsername: process.env.TELEGRAM_BOT_USERNAME ?? "",
      loginWidget: false,
      oidc: {
        enabled: true,
        clientSecret: process.env.TELEGRAM_OIDC_CLIENT_SECRET ?? "",
        // Stamp the Telegram id onto the user so an OIDC (web) login and a
        // Mini App sign-in for the same Telegram account resolve to ONE user:
        // the Mini App path looks up an existing user by `telegramId` before
        // creating a new one. Without this, OIDC users have a null telegramId
        // and would be duplicated on first Mini App launch.
        //
        // Use the id_token's `id` claim (the real numeric Telegram user id,
        // matching initData), NOT `sub` — Telegram's `sub` is an opaque
        // pairwise identifier that does not match the Mini App id. The lib's
        // TelegramOIDCClaims type omits `id`, so read it via a narrowed cast.
        mapOIDCProfileToUser: (claims) => {
          const telegramId = (claims as { id?: string | number }).id;
          return telegramId ? { telegramId: String(telegramId) } : {};
        },
      },
    }),
  ],
});
