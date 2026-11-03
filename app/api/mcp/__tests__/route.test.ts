import { beforeEach, describe, expect, it, vi } from "vitest";

const getMcpSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/auth", () => ({ auth: { api: { getMcpSession } } }));
vi.mock("@/lib/mcp/clients", () => ({
  findOAuthClientName: vi.fn().mockResolvedValue("Claude"),
}));
vi.mock("@/lib/recipes/queries", () => ({
  DEFAULT_LIST_LIMIT: 20,
  MAX_LIST_LIMIT: 50,
  listRecipes: vi.fn(),
  getRecipe: vi.fn(),
}));
vi.mock("@/lib/parse-recipe/server-import", () => ({}));
vi.mock("@/lib/recipes/collections", () => ({}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));
vi.mock("@/lib/recipes/mutations", () => ({}));
vi.mock("@/lib/telemetry", () => ({
  log: vi.fn(),
  captureError: vi.fn(),
  trackEvent: vi.fn(),
}));

import { OPTIONS, POST } from "../route";

function rpc(body: object, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const initialize = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test", version: "1" },
  },
};

describe("/api/mcp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL = "http://localhost:3000";
  });

  it("challenges a request without a token, pointing at resource metadata", async () => {
    const response = await POST(rpc(initialize));

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe(
      'Bearer resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource/api/mcp"',
    );
    expect(getMcpSession).not.toHaveBeenCalled();
  });

  it("challenges an unknown or expired token", async () => {
    getMcpSession.mockResolvedValue(null);
    const response = await POST(
      rpc(initialize, { authorization: "Bearer expired" }),
    );
    expect(response.status).toBe(401);
  });

  it("serves the MCP handshake for a valid token", async () => {
    getMcpSession.mockResolvedValue({ userId: "user-1", clientId: "c1" });
    const response = await POST(
      rpc(initialize, { authorization: "Bearer good" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.serverInfo.name).toBe("recipai");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("answers CORS preflight", () => {
    const response = OPTIONS();
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-headers")).toContain(
      "Authorization",
    );
  });
});
