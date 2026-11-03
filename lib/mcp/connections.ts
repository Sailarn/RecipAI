import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  oauthAccessToken,
  oauthApplication,
  oauthConsent,
} from "@/db/schema/auth";
import { type AiAppId, aiAppFromClientName } from "@/lib/ai-apps";

/** One AI app client the user has authorized and that can still refresh. */
export interface AiConnection {
  clientId: string;
  name: string;
  app: AiAppId | null;
  connectedAt: string;
  lastActiveAt: string;
}

export async function listConnections(userId: string): Promise<AiConnection[]> {
  const rows = await db
    .select({
      clientId: oauthAccessToken.clientId,
      name: oauthApplication.name,
      createdAt: oauthAccessToken.createdAt,
    })
    .from(oauthAccessToken)
    .innerJoin(
      oauthApplication,
      eq(oauthApplication.clientId, oauthAccessToken.clientId),
    )
    .where(
      and(
        eq(oauthAccessToken.userId, userId),
        gt(oauthAccessToken.refreshTokenExpiresAt, new Date()),
      ),
    );

  const byClient = new Map<string, AiConnection>();
  for (const row of rows) {
    const at = row.createdAt.toISOString();
    const existing = byClient.get(row.clientId);
    if (existing) {
      if (at < existing.connectedAt) existing.connectedAt = at;
      if (at > existing.lastActiveAt) existing.lastActiveAt = at;
      continue;
    }
    byClient.set(row.clientId, {
      clientId: row.clientId,
      name: row.name,
      app: aiAppFromClientName(row.name),
      connectedAt: at,
      lastActiveAt: at,
    });
  }
  return [...byClient.values()].sort((a, b) =>
    b.lastActiveAt.localeCompare(a.lastActiveAt),
  );
}

/**
 * Disconnect AI app clients: their tokens stop working at once (the MCP
 * endpoint looks every token up) and the consent records go too.
 */
export async function revokeConnections(
  userId: string,
  clientIds: string[],
): Promise<number> {
  if (clientIds.length === 0) return 0;
  const revoked = await db
    .delete(oauthAccessToken)
    .where(
      and(
        eq(oauthAccessToken.userId, userId),
        inArray(oauthAccessToken.clientId, clientIds),
      ),
    )
    .returning({ id: oauthAccessToken.id });
  await db
    .delete(oauthConsent)
    .where(
      and(
        eq(oauthConsent.userId, userId),
        inArray(oauthConsent.clientId, clientIds),
      ),
    );
  return revoked.length;
}
