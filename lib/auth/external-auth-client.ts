import { deviceAuthorizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { externalLinkClient } from "./external-link-client";

export const externalAuthClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_EXTERNAL_AUTH_URL ?? "http://localhost:3000",
  fetchOptions: {
    credentials: "include",
  },
  plugins: [deviceAuthorizationClient(), externalLinkClient()],
});
