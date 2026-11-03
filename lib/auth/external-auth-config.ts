export const PWA_AUTH_CLIENT_ID = "recipai-pwa";
export const EXTERNAL_AUTH_TTL_MS = 5 * 60 * 1000;
export const DEVICE_POLL_INTERVAL_MS = 5 * 1000;

const LOCAL_EXTERNAL_AUTH_URL = "http://localhost:3000";
// The production app host. Vercel is the only host; any extra origins (a
// separate external-auth domain, a custom domain) come from the configured
// URLs passed to getAllowedAuthHosts.
const PRODUCTION_APP_HOST = "recip-ai-wine.vercel.app";
const LOOPBACK_HOST = /^(localhost|127\.0\.0\.1)(:\d+)?$/;
const DEVELOPMENT_AUTH_HOSTS = [
  "localhost",
  "localhost:*",
  "127.0.0.1",
  "127.0.0.1:*",
  "*.vercel.app",
];

export interface ExternalAuthUrlOptions {
  configuredUrl?: string;
}

export type AuthEnvironment = "development" | "production";

export function getExternalAuthUrl({
  configuredUrl,
}: ExternalAuthUrlOptions): string {
  return (configuredUrl ?? LOCAL_EXTERNAL_AUTH_URL).replace(/\/+$/, "");
}

export function assertSeparateAuthOrigins(
  appOrigin: string,
  externalOrigin: string,
): void {
  if (new URL(appOrigin).origin === new URL(externalOrigin).origin) {
    throw new Error("External authentication must use a separate origin.");
  }
}

function hostOf(url: string | undefined): string | undefined {
  if (!url || !URL.canParse(url)) return undefined;
  return new URL(url).host;
}

/**
 * Hosts better-auth may treat as its own base URL. Exact hosts only in
 * production: the Vercel app host plus the hosts of the configured app and
 * external-auth URLs (loopback excluded, in case a local default leaks into
 * production env). Development adds localhost and Vercel previews.
 */
export function getAllowedAuthHosts(
  environment: AuthEnvironment,
  configuredUrls: Array<string | undefined> = [],
): string[] {
  const configuredHosts = configuredUrls.flatMap((url) => {
    const host = hostOf(url);
    return host ? [host] : [];
  });

  const hosts =
    environment === "development"
      ? [PRODUCTION_APP_HOST, ...DEVELOPMENT_AUTH_HOSTS, ...configuredHosts]
      : [
          PRODUCTION_APP_HOST,
          ...configuredHosts.filter((host) => !LOOPBACK_HOST.test(host)),
        ];
  return [...new Set(hosts)];
}

export function validatePwaClient(clientId: string): boolean {
  return clientId === PWA_AUTH_CLIENT_ID;
}
