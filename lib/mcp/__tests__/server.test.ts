import { beforeEach, describe, expect, it, vi } from "vitest";

const listRecipes = vi.hoisted(() => vi.fn());
const getRecipe = vi.hoisted(() => vi.fn());
const captureError = vi.hoisted(() => vi.fn());
const trackEvent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/recipes/queries", () => ({
  DEFAULT_LIST_LIMIT: 20,
  MAX_LIST_LIMIT: 50,
  listRecipes,
  getRecipe,
}));
vi.mock("@/lib/telemetry", () => ({ captureError, trackEvent }));

import { createRecipaiMcpServer } from "../server";
import { connectTestClient, resultJson } from "./test-client";

const context = {
  caller: { userId: "user-1", clientId: "client-1", clientName: "Claude" },
  origin: "https://app.example",
};

describe("RecipAI MCP server", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exposes the read tools as read-only", async () => {
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const { tools } = await client.listTools();
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

    expect(byName.list_recipes.annotations?.readOnlyHint).toBe(true);
    expect(byName.get_recipe.annotations?.readOnlyHint).toBe(true);
  });

  it("scopes list_recipes to the token's user, never to tool input", async () => {
    listRecipes.mockResolvedValue({ recipes: [], nextOffset: null });
    const client = await connectTestClient(createRecipaiMcpServer(context));

    const result = await client.callTool({
      name: "list_recipes",
      arguments: { query: "soup", userId: "someone-else" },
    });

    expect(listRecipes).toHaveBeenCalledWith(
      "user-1",
      "https://app.example",
      expect.objectContaining({ query: "soup" }),
    );
    expect(resultJson(result)).toEqual({ recipes: [], nextOffset: null });
    expect(trackEvent).toHaveBeenCalledWith("mcp_tool_called", {
      tool: "list_recipes",
      client: "Claude",
      ok: true,
    });
  });

  it("rejects invalid input before reaching the database", async () => {
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name: "list_recipes",
      arguments: { limit: 500 },
    });

    expect(result.isError).toBe(true);
    expect(listRecipes).not.toHaveBeenCalled();
  });

  it("reports a missing recipe as a tool error", async () => {
    getRecipe.mockResolvedValue(null);
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name: "get_recipe",
      arguments: { id: "nope" },
    });

    expect(getRecipe).toHaveBeenCalledWith(
      "user-1",
      "nope",
      "https://app.example",
    );
    expect(result.isError).toBe(true);
  });

  it("turns unexpected failures into a captured tool error", async () => {
    getRecipe.mockRejectedValue(new Error("db down"));
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name: "get_recipe",
      arguments: { id: "r1" },
    });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).not.toContain("db down");
    expect(captureError).toHaveBeenCalled();
  });
});
