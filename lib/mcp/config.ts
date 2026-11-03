/**
 * Shared constants for the RecipAI connector — the remote MCP server at
 * `/api/mcp` that AI chat apps (Claude, ChatGPT) connect to over OAuth.
 * See docs/specs/ai-connector.md.
 */

/** better-auth `mcp` plugin `loginPage`: shown when /mcp/authorize has no session. */
export const MCP_LOGIN_PATH = "/external-auth/oauth/login";

/** better-auth `mcp` plugin `consentPage`. */
export const MCP_CONSENT_PATH = "/external-auth/oauth/consent";

/** Path of the MCP endpoint itself. */
export const MCP_ENDPOINT_PATH = "/api/mcp";

/** better-auth's authorize endpoint for the `mcp` plugin. */
export const MCP_AUTHORIZE_PATH = "/api/auth/mcp/authorize";

/** Access tokens are short-lived; clients refresh them with `offline_access`. */
export const MCP_ACCESS_TOKEN_TTL_SECONDS = 60 * 60;

/** A connected chat app stays connected for 30 days without use. */
export const MCP_REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

const LOCAL_ORIGIN = "http://localhost:3000";

/**
 * The public origin of this deployment — the OAuth issuer and the host of the
 * MCP resource. `NEXT_PUBLIC_BETTER_AUTH_URL` is the canonical app URL in every
 * environment (production, preview, a dev tunnel, localhost).
 */
export function appOrigin(
  configuredUrl: string | undefined = process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
): string {
  try {
    return new URL(configuredUrl || LOCAL_ORIGIN).origin;
  } catch {
    return LOCAL_ORIGIN;
  }
}

/** The MCP resource identifier advertised to clients (RFC 9728 `resource`). */
export function mcpResourceUrl(origin: string = appOrigin()): string {
  return `${origin}${MCP_ENDPOINT_PATH}`;
}
