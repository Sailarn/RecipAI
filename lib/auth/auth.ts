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
      "/external-link/generate": { window: 60, max: 5 },
      "/external-link/redeem": { window: 60, max: 10 },
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
        enabled: false,
      },
      botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
      botUsername: process.env.TELEGRAM_BOT_USERNAME ?? "",
      loginWidget: false,
      oidc: {
        enabled: true,
        clientSecret: process.env.TELEGRAM_OIDC_CLIENT_SECRET ?? "",
      },
    }),
  ],
});
