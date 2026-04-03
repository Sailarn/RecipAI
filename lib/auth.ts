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
  accountLinking: {
    enabled: true,
    trustedProviders: ["google", "telegram-oidc", "telegram", "telegram_oidc", "better-auth-telegram", "better-auth-telegram-oidc"],
  },
  onEvent: {
    onRequest: (ctx: any) => {
      // Look for the callback request
      if (ctx.request.url.includes('/callback')) {
        console.log("=== Auth Callback Debug ===");
        // When the callback hits, the provider ID is usually in the URL path 
        // e.g., /api/auth/callback/telegram-oidc
        console.log("Callback URL:", ctx.request.url);
      }
    },
    // Sometimes the error event gives us the context we need
    onError: (ctx: any) => {
        if(ctx.error.message.includes("untrusted provider")){
            console.log("Untrusted Provider Error Context:", JSON.stringify(ctx, null, 2));
        }
    }
  },
  databaseHooks: {
    account: {
      create: {
        before: async (account) => {
          console.log("ACCOUNT CREATE providerId:", account.providerId, account);
          return { data: account };
        },
      },
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
