import {
  discoveryPreflight,
  discoveryResponse,
  protectedResourceMetadata,
} from "@/lib/mcp/metadata";

// RFC 9728 protected resource metadata for /api/mcp. MCP clients try the
// path-suffixed form (/.well-known/oauth-protected-resource/api/mcp) and then
// the root; the optional catch-all serves both.
export function GET() {
  return discoveryResponse(protectedResourceMetadata());
}

export function OPTIONS() {
  return discoveryPreflight();
}
