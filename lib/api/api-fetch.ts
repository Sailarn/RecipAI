import {
  DEFAULT_MAINTENANCE_MESSAGE,
  MAINTENANCE_MODE_CODE,
} from "@/lib/maintenance-constants";

// Dispatched on `window` when an API request is rejected by the maintenance
// kill-switch. MaintenanceListener (mounted in the client shell) shows the
// server-supplied message as a toast, so any blocked request surfaces it
// without each call site needing its own UI.
export const MAINTENANCE_EVENT = "recipai:maintenance";

export class MaintenanceError extends Error {
  readonly isMaintenance = true;

  constructor(message: string) {
    super(message);
    this.name = "MaintenanceError";
  }
}

export function isMaintenanceError(error: unknown): error is MaintenanceError {
  return error instanceof MaintenanceError;
}

type MaintenanceBody = { code?: unknown; error?: unknown };

/**
 * Returns a MaintenanceError carrying the server message when `response` is a
 * maintenance-mode 503, otherwise null. Reads a clone so the caller can still
 * consume the original body.
 */
export async function maintenanceErrorFromResponse(
  response: Response,
): Promise<MaintenanceError | null> {
  if (response.status !== 503) return null;

  try {
    const body = (await response.clone().json()) as MaintenanceBody | null;
    if (!body || body.code !== MAINTENANCE_MODE_CODE) return null;

    const message =
      typeof body.error === "string" && body.error.trim().length > 0
        ? body.error
        : DEFAULT_MAINTENANCE_MESSAGE;
    return new MaintenanceError(message);
  } catch {
    return null;
  }
}

export function announceMaintenance(message: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(MAINTENANCE_EVENT, { detail: { message } }),
  );
}

/**
 * For call sites that already branch on `!response.ok`: detects a maintenance
 * 503, surfaces the message globally, and reports whether it handled the
 * response — so the caller can skip its own generic error message.
 */
export async function announceIfMaintenance(
  response: Response,
): Promise<boolean> {
  const maintenance = await maintenanceErrorFromResponse(response);
  if (!maintenance) return false;
  announceMaintenance(maintenance.message);
  return true;
}

/**
 * fetch wrapper for client → API calls. Surfaces the maintenance message
 * globally and throws MaintenanceError when the request is blocked; otherwise
 * returns the Response untouched (callers keep their own `!ok` handling).
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);
  const maintenance = await maintenanceErrorFromResponse(response);
  if (maintenance) {
    announceMaintenance(maintenance.message);
    throw maintenance;
  }
  return response;
}
