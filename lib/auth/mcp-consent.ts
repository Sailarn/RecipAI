import { APIError } from "better-auth/api";

/**
 * Consent hardening for the better-auth `mcp` plugin (OAuth provider for the
 * AI connector). Both functions run as better-auth `hooks.before` handlers.
 *
 * 1. `forceMcpConsent` — the plugin only shows the consent page when the
 *    client itself sends `prompt=consent`; otherwise a signed-in user is
 *    redirected straight back with an authorization code. Dynamic client
 *    registration is open to anyone, so that silent grant would let any
 *    registered client obtain a token for a signed-in user who opens a crafted
 *    authorize link. Forcing `prompt=consent` routes every authorization
 *    through the consent page. Returning `{ context }` merges the rewritten
 *    query into the endpoint context (and into the login-resume cookie the
 *    plugin stores when the user still has to sign in).
 *
 * 2. `rejectUnconsentedCode` — while consent is pending, the plugin stores the
 *    request under the consent code, and its token endpoint does not check
 *    whether consent was given, so that code is already redeemable. It only
 *    travels in the consent page URL, but a leaked URL (history, a referrer)
 *    must not be enough: refuse to exchange a code that still needs consent.
 */
export const MCP_AUTHORIZE_ENDPOINT = "/mcp/authorize";
export const MCP_TOKEN_ENDPOINT = "/mcp/token";

interface AuthorizeHookContext {
  path?: string;
  query?: Record<string, unknown> | undefined;
}

export function forceMcpConsent(
  ctx: AuthorizeHookContext,
): { context: { query: Record<string, unknown> } } | undefined {
  if (ctx.path !== MCP_AUTHORIZE_ENDPOINT) return undefined;
  return { context: { query: { ...(ctx.query ?? {}), prompt: "consent" } } };
}

interface TokenHookContext {
  path?: string;
  body?: unknown;
  context: {
    internalAdapter: {
      findVerificationValue: (
        identifier: string,
      ) => Promise<{ value: string } | null | undefined>;
    };
  };
}

function bodyField(body: unknown, key: string): string | undefined {
  if (body instanceof FormData) {
    const value = body.get(key);
    return typeof value === "string" ? value : undefined;
  }
  if (body && typeof body === "object" && key in body) {
    const value = (body as Record<string, unknown>)[key];
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

/** True when a stored authorization request is still waiting for consent. */
export function isAwaitingConsent(storedValue: string): boolean {
  try {
    return JSON.parse(storedValue)?.requireConsent === true;
  } catch {
    return false;
  }
}

export async function rejectUnconsentedCode(
  ctx: TokenHookContext,
): Promise<void> {
  if (ctx.path !== MCP_TOKEN_ENDPOINT) return;
  if (bodyField(ctx.body, "grant_type") !== "authorization_code") return;
  const code = bodyField(ctx.body, "code");
  if (!code) return;

  const stored = await ctx.context.internalAdapter.findVerificationValue(code);
  if (stored && isAwaitingConsent(stored.value)) {
    throw new APIError("UNAUTHORIZED", {
      error: "invalid_grant",
      error_description: "authorization code has not been consented to",
    });
  }
}
