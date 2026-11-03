import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.hoisted(() => vi.fn());
const listConnections = vi.hoisted(() => vi.fn());
const revokeConnections = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/require-session", () => ({ requireSession }));
vi.mock("@/lib/mcp/connections", () => ({
  listConnections,
  revokeConnections,
}));

import { DELETE, GET } from "../route";

const authed = { session: { user: { id: "user-1" } } };

function deleteRequest(body: unknown) {
  return new Request("http://localhost/api/mcp/connections", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("/api/mcp/connections", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires a session", async () => {
    requireSession.mockResolvedValue({
      response: new Response(null, { status: 401 }),
    });
    const response = await GET(
      new Request("http://localhost") as unknown as NextRequest,
    );
    expect(response.status).toBe(401);
    expect(listConnections).not.toHaveBeenCalled();
  });

  it("lists the caller's connections", async () => {
    requireSession.mockResolvedValue(authed);
    listConnections.mockResolvedValue([{ clientId: "c1", app: "claude" }]);
    const response = await GET(
      new Request("http://localhost") as unknown as NextRequest,
    );
    expect(listConnections).toHaveBeenCalledWith("user-1");
    expect(await response.json()).toEqual({
      connections: [{ clientId: "c1", app: "claude" }],
    });
  });

  it("revokes the given clients for the caller", async () => {
    requireSession.mockResolvedValue(authed);
    revokeConnections.mockResolvedValue(2);
    const response = await DELETE(deleteRequest({ clientIds: ["c1", "c2"] }));
    expect(revokeConnections).toHaveBeenCalledWith("user-1", ["c1", "c2"]);
    expect(await response.json()).toEqual({ revoked: 2 });
  });

  it.each([{}, { clientIds: [] }, { clientIds: [1] }, { clientIds: "c1" }])(
    "rejects a malformed body %j",
    async (body) => {
      requireSession.mockResolvedValue(authed);
      const response = await DELETE(deleteRequest(body));
      expect(response.status).toBe(400);
      expect(revokeConnections).not.toHaveBeenCalled();
    },
  );
});
