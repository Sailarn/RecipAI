import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { deviceAuthorization, mcp } from "better-auth/plugins";
import { telegram } from "better-auth-telegram";
import { db } from "@/db";
import * as schema from "@/db/schema/auth";
import { shouldReportAuthError } from "@/lib/auth/auth-error-report";
import {
  getAllowedAuthHosts,
  getExternalAuthUrl,
  validatePwaClient,
} from "@/lib/auth/external-auth-config";
import { externalLink } from "@/lib/auth/external-link-plugin";
import { forceMcpConsent, rejectUnconsentedCode } from "@/lib/auth/mcp-consent";
import { miniAppDataToUser } from "@/lib/auth/telegram-user";
import {
  MCP_ACCESS_TOKEN_TTL_SECONDS,
  MCP_CONSENT_PATH,
  MCP_DEFAULT_SCOPE,
  MCP_LOGIN_PATH,
  MCP_REFRESH_TOKEN_TTL_SECONDS,
  mcpResourceUrl,
} from "@/lib/mcp/config";
import { captureError } from "@/lib/telemetry";

const authEnvironment =
  process.env.NODE_ENV === "production" ? "production" : "development";
const externalAuthUrl = getExternalAuthUrl({
  configuredUrl: process.env.NEXT_PUBLIC_EXTERNAL_AUTH_URL,
});

export const auth = betterAuth({
  baseURL: {
    allowedHosts: getAllowedAuthHosts(authEnvironment, [
      process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
      process.env.NEXT_PUBLIC_EXTERNAL_AUTH_URL,
    ]),
    fallback: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    protocol: "auto",
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  // The auth endpoints (/api/auth/*) are served by better-auth's own handler,
  // so their failures never reach our ApiError wrapper and were invisible in
  // Sentry — a new Mini App user failing to insert (NOT NULL email) showed the
  // user a stuck login screen with no error report. Forward genuine failures to
  // Sentry; shouldReportAuthError skips routine 4xx (denied logins, rate limits).
  onAPIError: {
    onError: (error: unknown) => {
      if (shouldReportAuthError(error)) {
        captureError(error, { tags: { source: "better-auth" } });
      }
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      await rejectUnconsentedCode(ctx);
      return forceMcpConsent(ctx);
    }),
  },
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
    // OAuth provider for the RecipAI connector (/api/mcp): AI chat apps
    // register via dynamic client registration and users approve them on the
    // consent page. See docs/specs/ai-connector.md.
    mcp({
      loginPage: MCP_LOGIN_PATH,
      resource: mcpResourceUrl(),
      oidcConfig: {
        loginPage: MCP_LOGIN_PATH,
        consentPage: MCP_CONSENT_PATH,
        requirePKCE: true,
        // Clients that request no scope still get a refresh token, so the
        // connection survives the 1 h access-token lifetime.
        defaultScope: MCP_DEFAULT_SCOPE,
        accessTokenExpiresIn: MCP_ACCESS_TOKEN_TTL_SECONDS,
        refreshTokenExpiresIn: MCP_REFRESH_TOKEN_TTL_SECONDS,
      },
    }),
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
        // pairwise identifier that does not match the Mini App id.
        mapOIDCProfileToUser: (claims) => {
          const telegramId = claims.id;
          return telegramId ? { telegramId: String(telegramId) } : {};
        },
      },
    }),
  ],
});
