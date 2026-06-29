// Client-safe maintenance constants. Kept free of server-only imports (db,
// next/server) so both API routes and browser code can read them.

export const MAINTENANCE_MODE_CODE = "MAINTENANCE_MODE";
export const DEFAULT_MAINTENANCE_MESSAGE = "Service maintenance in progress";
