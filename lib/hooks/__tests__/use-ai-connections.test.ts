/**
 * @vitest-environment happy-dom
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetAiConnectionsCache,
  useAiConnections,
} from "../use-ai-connections";

const claude = {
  clientId: "c1",
  name: "Claude",
  app: "claude",
  connectedAt: "2026-11-01T00:00:00Z",
  lastActiveAt: "2026-11-02T00:00:00Z",
};

describe("useAiConnections", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    resetAiConnectionsCache();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("does nothing while signed out", () => {
    const { result } = renderHook(() => useAiConnections(false));
    expect(result.current.status).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads the connected apps", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ connections: [claude] })),
    );
    const { result } = renderHook(() => useAiConnections(true));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.connectedApps.has("claude")).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/api/mcp/connections", {
      credentials: "include",
    });
  });

  it("shares one fetch between consumers", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ connections: [] })),
    );
    const first = renderHook(() => useAiConnections(true));
    const second = renderHook(() => useAiConnections(true));

    await waitFor(() => expect(first.result.current.status).toBe("ready"));
    await waitFor(() => expect(second.result.current.status).toBe("ready"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports errors", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 500 }));
    const { result } = renderHook(() => useAiConnections(true));
    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("disconnects and reloads", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ connections: [claude] })),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ revoked: 1 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ connections: [] })));
    const { result } = renderHook(() => useAiConnections(true));
    await waitFor(() => expect(result.current.connectedApps.size).toBe(1));

    await act(() => result.current.disconnect(["c1"]));

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/mcp/connections",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ clientIds: ["c1"] }),
      }),
    );
    expect(result.current.connectedApps.size).toBe(0);
  });
});
