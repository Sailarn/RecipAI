import { eq } from "drizzle-orm";
import { db } from "@/db";
import { oauthApplication } from "@/db/schema/auth";

/**
 * Display name of a registered OAuth client (e.g. "Claude"), as it named
 * itself during dynamic client registration. Null when the client is unknown.
 */
export async function findOAuthClientName(
  clientId: string | undefined,
): Promise<string | null> {
  if (!clientId) return null;
  const [row] = await db
    .select({ name: oauthApplication.name })
    .from(oauthApplication)
    .where(eq(oauthApplication.clientId, clientId))
    .limit(1);
  return row?.name?.trim() || null;
}
