import { describe, expect, it } from "vitest";
import {
  authorizationServerMetadata,
  protectedResourceMetadata,
  protectedResourceMetadataUrl,
} from "../metadata";

const ORIGIN = "https://recip-ai-wine.vercel.app";

describe("authorizationServerMetadata", () => {
  it("advertises the mcp plugin endpoints under the app origin", () => {
    const metadata = authorizationServerMetadata(ORIGIN);
    expect(metadata.issuer).toBe(ORIGIN);
    expect(metadata.authorization_endpoint).toBe(
      `${ORIGIN}/api/auth/mcp/authorize`,
    );
    expect(metadata.token_endpoint).toBe(`${ORIGIN}/api/auth/mcp/token`);
    expect(metadata.registration_endpoint).toBe(
      `${ORIGIN}/api/auth/mcp/register`,
    );
  });

  it("requires S256 PKCE and supports public clients", () => {
    const metadata = authorizationServerMetadata(ORIGIN);
    expect(metadata.code_challenge_methods_supported).toEqual(["S256"]);
    expect(metadata.token_endpoint_auth_methods_supported).toContain("none");
    expect(metadata.scopes_supported).toContain("offline_access");
  });
});

describe("protectedResourceMetadata", () => {
  it("names /api/mcp as the resource and the app origin as its server", () => {
    expect(protectedResourceMetadata(ORIGIN)).toMatchObject({
      resource: `${ORIGIN}/api/mcp`,
      authorization_servers: [ORIGIN],
      bearer_methods_supported: ["header"],
    });
  });

  it("is linked from 401s in the path-suffixed form", () => {
    expect(protectedResourceMetadataUrl(ORIGIN)).toBe(
      `${ORIGIN}/.well-known/oauth-protected-resource/api/mcp`,
    );
  });
});
