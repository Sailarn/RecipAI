import { eq } from "drizzle-orm";
import type { NextResponse } from "next/server";
import { db } from "@/db";
import { appConfig, GLOBAL_APP_CONFIG_ID } from "@/db/schema/app-config";
import {
  API_ERROR_MESSAGES,
  ApiError,
  MAINTENANCE_MODE_CODE,
} from "@/lib/api-errors";

export { MAINTENANCE_MODE_CODE };
export const DEFAULT_MAINTENANCE_MESSAGE = API_ERROR_MESSAGES.MAINTENANCE;

type AppConfigRow = {
  maintenanceEnabled: boolean;
  maintenanceMessage: string | null;
};

function getMaintenanceMessage(config: AppConfigRow): string {
  return config.maintenanceMessage?.trim() || DEFAULT_MAINTENANCE_MESSAGE;
}

async function getAppConfig(): Promise<AppConfigRow | null> {
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

export async function ensureAppAvailable(): Promise<NextResponse | null> {
  let config: AppConfigRow | null;
  try {
    config = await getAppConfig();
  } catch {
    return ApiError.maintenance();
  }

  if (!config?.maintenanceEnabled) return null;

  return ApiError.maintenance(getMaintenanceMessage(config));
}
