import { passkeyClient } from "@better-auth/passkey/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { telegramClient } from "better-auth-telegram/client";
import { externalLinkClient } from "./external-link-client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "",
  fetchOptions: {
    credentials: "include",
  },
  plugins: [
    deviceAuthorizationClient(),
    externalLinkClient(),
    passkeyClient(),
    telegramClient(),
  ],
});
