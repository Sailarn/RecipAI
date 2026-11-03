import { appOrigin, MCP_SCOPES, mcpResourceUrl } from "./config";

/**
 * OAuth discovery documents for the connector. Built here rather than with the
 * better-auth `mcp` plugin's helpers: those derive the issuer from a string
 * `baseURL`, and RecipAI's is a dynamic allowed-hosts config, so the plugin's
 * own metadata endpoint fails with "issuer or baseURL is not set".
 *
 * The issuer is the app origin, so clients find this at
 * `<origin>/.well-known/oauth-authorization-server`; the endpoints are the
 * plugin's, under `/api/auth/mcp/*`.
 */
export function authorizationServerMetadata(origin: string = appOrigin()) {
  const endpoint = (path: string) => `${origin}/api/auth/mcp/${path}`;
  return {
    issuer: origin,
    authorization_endpoint: endpoint("authorize"),
    token_endpoint: endpoint("token"),
    registration_endpoint: endpoint("register"),
    scopes_supported: MCP_SCOPES,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post",
      "none",
    ],
    code_challenge_methods_supported: ["S256"],
    service_documentation: `${origin}/`,
  };
}

/** RFC 9728 protected resource metadata for `/api/mcp`. */
export function protectedResourceMetadata(origin: string = appOrigin()) {
  return {
    resource: mcpResourceUrl(origin),
    resource_name: "RecipAI",
    authorization_servers: [origin],
    scopes_supported: MCP_SCOPES,
    bearer_methods_supported: ["header"],
  };
}

/** Where a 401 from `/api/mcp` points clients (RFC 9728 path-suffixed form). */
export function protectedResourceMetadataUrl(
  origin: string = appOrigin(),
): string {
  return `${origin}/.well-known/oauth-protected-resource/api/mcp`;
}

export const DISCOVERY_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, mcp-protocol-version",
  "Access-Control-Max-Age": "86400",
} as const;

export function discoveryResponse(body: unknown): Response {
  return Response.json(body, {
    headers: {
      ...DISCOVERY_CORS_HEADERS,
      "Cache-Control": "public, max-age=300",
    },
  });
}

export function discoveryPreflight(): Response {
  return new Response(null, { status: 204, headers: DISCOVERY_CORS_HEADERS });
}
