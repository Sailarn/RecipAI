export const PWA_AUTH_CLIENT_ID = "recipai-pwa";
export const EXTERNAL_AUTH_TTL_MS = 5 * 60 * 1000;
export const DEVICE_POLL_INTERVAL_MS = 5 * 1000;

const LOCAL_EXTERNAL_AUTH_URL = "http://localhost:3000";
const PRODUCTION_AUTH_HOSTS = ["recipai.pp.ua", "auth.recipai.pp.ua"];
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

export function getAllowedAuthHosts(
  environment: AuthEnvironment,
  configuredAppUrl?: string,
): string[] {
  if (environment === "development") {
    const configuredHost = configuredAppUrl
      ? new URL(configuredAppUrl).host
      : undefined;
    return [
      ...PRODUCTION_AUTH_HOSTS,
      ...DEVELOPMENT_AUTH_HOSTS,
      ...(configuredHost ? [configuredHost] : []),
    ];
  }

  return [...PRODUCTION_AUTH_HOSTS];
}

export function validatePwaClient(clientId: string): boolean {
  return clientId === PWA_AUTH_CLIENT_ID;
}
