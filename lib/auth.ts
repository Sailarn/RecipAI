import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { telegram } from "better-auth-telegram";
import { db } from "@/db";
import * as schema from "@/db/schema/auth";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "telegram-oidc", "telegram", "telegram_oidc"],
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    passkey(),
    telegram({
      botToken: process.env.TELEGRAM_BOT_TOKEN!,
      botUsername: process.env.TELEGRAM_BOT_USERNAME!,
      loginWidget: false,
      oidc: {
        enabled: true,
        clientSecret: process.env.TELEGRAM_OIDC_CLIENT_SECRET!,
      },
    }),
  ],
});
