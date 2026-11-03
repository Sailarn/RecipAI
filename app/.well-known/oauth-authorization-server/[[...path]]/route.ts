import {
  authorizationServerMetadata,
  discoveryPreflight,
  discoveryResponse,
} from "@/lib/mcp/metadata";

// RFC 8414 authorization server metadata for the connector OAuth flow. The
// optional catch-all also answers the path-suffixed form some clients try
// first (e.g. /.well-known/oauth-authorization-server/api/auth).
export function GET() {
  return discoveryResponse(authorizationServerMetadata());
}

export function OPTIONS() {
  return discoveryPreflight();
}
