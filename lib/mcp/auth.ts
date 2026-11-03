import { auth } from "@/lib/auth/auth";
import { findOAuthClientName } from "./clients";
import type { McpCaller } from "./context";
import { protectedResourceMetadataUrl } from "./metadata";

export const MCP_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Accept, mcp-protocol-version, mcp-session-id, last-event-id",
  "Access-Control-Expose-Headers": "WWW-Authenticate, mcp-session-id",
  "Access-Control-Max-Age": "86400",
} as const;

/**
 * 401 that starts the client's OAuth discovery (MCP authorization spec):
 * `WWW-Authenticate` points at the protected resource metadata.
 */
export function unauthorizedResponse(): Response {
  const challenge = `Bearer resource_metadata="${protectedResourceMetadataUrl()}"`;
  return Response.json(
    {
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized: sign in to RecipAI" },
      id: null,
    },
    {
      status: 401,
      headers: { ...MCP_CORS_HEADERS, "WWW-Authenticate": challenge },
    },
  );
}

/**
 * Resolve the caller from the request's `Authorization: Bearer` token, issued
 * by the better-auth `mcp` plugin. Null when missing, unknown or expired.
 */
export async function authenticateMcpRequest(
  req: Request,
): Promise<McpCaller | null> {
  if (!req.headers.get("authorization")?.startsWith("Bearer ")) return null;

  const token = await auth.api.getMcpSession({ headers: req.headers });
  if (!token?.userId) return null;

  const clientName =
    (await findOAuthClientName(token.clientId).catch(() => null)) ?? "unknown";
  return { userId: token.userId, clientId: token.clientId, clientName };
}
