/**
 * The better-auth `mcp` plugin only shows the consent page when the client
 * itself sends `prompt=consent`; otherwise a signed-in user is redirected
 * straight back with an authorization code. Dynamic client registration is
 * open to anyone, so that silent grant would let any registered client obtain
 * a token for a signed-in user who opens a crafted authorize link. Forcing
 * `prompt=consent` makes every authorization pass through the consent page.
 *
 * Used as a better-auth `hooks.before` handler: returning `{ context }` merges
 * the rewritten query into the endpoint context (and into the login-resume
 * cookie the plugin stores when the user still has to sign in).
 */
export const MCP_AUTHORIZE_ENDPOINT = "/mcp/authorize";

interface HookContext {
  path?: string;
  query?: Record<string, unknown> | undefined;
}

export function forceMcpConsent(
  ctx: HookContext,
): { context: { query: Record<string, unknown> } } | undefined {
  if (ctx.path !== MCP_AUTHORIZE_ENDPOINT) return undefined;
  return { context: { query: { ...(ctx.query ?? {}), prompt: "consent" } } };
}
