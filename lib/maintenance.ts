import { eq } from "drizzle-orm";
import type { NextResponse } from "next/server";
import { db } from "@/db";
import { appConfig, GLOBAL_APP_CONFIG_ID } from "@/db/schema/app-config";
import {
  API_ERROR_MESSAGES,
  ApiError,
  MAINTENANCE_MODE_CODE,
} from "@/lib/api-errors";
import { captureError } from "@/lib/telemetry";

export { MAINTENANCE_MODE_CODE };
export const DEFAULT_MAINTENANCE_MESSAGE = API_ERROR_MESSAGES.MAINTENANCE;

type AppConfigRow = {
  maintenanceEnabled: boolean;
  maintenanceMessage: string | null;
};

// This guard runs in the proxy for every /api request, so an uncached read put
// a full Postgres round-trip in front of every API call in the app — including
// the parse-job watcher, which polls every 3s. The flag changes about as often
// as never, so a short TTL is plenty: a toggle takes at most this long to reach
// an already-warm server instance.
const CONFIG_TTL_MS = 30_000;

let cachedConfig: AppConfigRow | null = null;
let cachedUntil = 0;
let inFlightRead: Promise<AppConfigRow | null> | null = null;

async function readAppConfig(): Promise<AppConfigRow | null> {
  const [config] = await db
    .select({
      maintenanceEnabled: appConfig.maintenanceEnabled,
      maintenanceMessage: appConfig.maintenanceMessage,
    })
    .from(appConfig)
    .where(eq(appConfig.id, GLOBAL_APP_CONFIG_ID))
    .limit(1);

  return config ?? null;
}

/**
 * Cached read, single-flighted so a burst of concurrent requests on a cold
 * instance issues one query rather than one each.
 */
async function getAppConfig(): Promise<AppConfigRow | null> {
  if (Date.now() < cachedUntil) return cachedConfig;
  if (inFlightRead) return inFlightRead;

  inFlightRead = readAppConfig()
    .then((config) => {
      cachedConfig = config;
      cachedUntil = Date.now() + CONFIG_TTL_MS;
      return config;
    })
    .finally(() => {
      inFlightRead = null;
    });

  return inFlightRead;
}

/** Test seam — module-level cache would otherwise leak between cases. */
export function resetAppConfigCache(): void {
  cachedConfig = null;
  cachedUntil = 0;
  inFlightRead = null;
}

function getMaintenanceMessage(config: AppConfigRow): string {
  return config.maintenanceMessage?.trim() || DEFAULT_MAINTENANCE_MESSAGE;
}

function maintenanceResponseFor(
  config: AppConfigRow | null,
): NextResponse | null {
  if (!config?.maintenanceEnabled) return null;
  return ApiError.maintenance(getMaintenanceMessage(config));
}

export async function ensureAppAvailable(): Promise<NextResponse | null> {
  try {
    return maintenanceResponseFor(await getAppConfig());
  } catch (error) {
    // Fail open. This runs in front of every /api route, including ones that
    // never touch Postgres (image upload, photo parse, embeds), so a blip on
    // this one small read must not 503 the entire API. Fall back to the last
    // value we successfully read — so a real maintenance window survives a
    // transient failure — and allow the request when we have never read one.
    captureError(error, { tags: { source: "maintenance-config" } });
    return maintenanceResponseFor(cachedConfig);
  }
}
