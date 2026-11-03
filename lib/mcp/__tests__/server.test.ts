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
const createRecipe = vi.hoisted(() => vi.fn());
const updateRecipe = vi.hoisted(() => vi.fn());
const deleteRecipe = vi.hoisted(() => vi.fn());
const importRecipeForUser = vi.hoisted(() => vi.fn());
const getImportStatus = vi.hoisted(() => vi.fn());
const rateLimit = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ allowed: true, remaining: 1, resetSeconds: 60 }),
);

vi.mock("@/lib/telemetry", () => ({ captureError, trackEvent, log: vi.fn() }));
vi.mock("@/lib/parse-recipe/server-import", () => ({
  importRecipeForUser,
  getImportStatus,
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/recipes/mutations", () => ({
  createRecipe,
  updateRecipe,
  deleteRecipe,
}));

import { createRecipaiMcpServer } from "../server";
import { connectTestClient, resultJson } from "./test-client";

const context = {
  caller: { userId: "user-1", clientId: "client-1", clientName: "Claude" },
  origin: "https://app.example",
};

describe("RecipAI MCP server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimit.mockResolvedValue({
      allowed: true,
      remaining: 1,
      resetSeconds: 60,
    });
  });

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

  it("marks delete as destructive and the other writes as not", async () => {
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const { tools } = await client.listTools();
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

    expect(byName.delete_recipe.annotations?.destructiveHint).toBe(true);
    expect(byName.create_recipe.annotations?.destructiveHint).toBe(false);
    expect(byName.update_recipe.annotations?.destructiveHint).toBe(false);
  });

  it("creates recipes for the token's user", async () => {
    createRecipe.mockResolvedValue({
      recipe: { id: "new" },
      alreadySaved: false,
    });
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name: "create_recipe",
      arguments: {
        title: "Toast",
        ingredients: [{ item: "bread", amount: 2, unit: "slices" }],
        instructions: [{ instruction: "Toast it" }],
      },
    });

    expect(createRecipe).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ title: "Toast" }),
      "https://app.example",
    );
    expect(resultJson(result)).toEqual({
      recipe: { id: "new" },
      alreadySaved: false,
    });
  });

  it("validates recipe input before writing", async () => {
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name: "create_recipe",
      arguments: { title: "Empty", ingredients: [], instructions: [] },
    });

    expect(result.isError).toBe(true);
    expect(createRecipe).not.toHaveBeenCalled();
  });

  it("passes the patch without the id to update_recipe", async () => {
    updateRecipe.mockResolvedValue(null);
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name: "update_recipe",
      arguments: { id: "r1", servings: 2, description: null },
    });

    expect(updateRecipe).toHaveBeenCalledWith(
      "user-1",
      "r1",
      { servings: 2, description: null },
      "https://app.example",
    );
    expect(result.isError).toBe(true);
  });

  it("reports deletions", async () => {
    deleteRecipe.mockResolvedValue({ id: "r1", title: "Toast" });
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name: "delete_recipe",
      arguments: { id: "r1" },
    });

    expect(deleteRecipe).toHaveBeenCalledWith("user-1", "r1");
    expect(resultJson(result)).toEqual({
      deleted: true,
      id: "r1",
      title: "Toast",
    });
  });

  it("refuses calls over the per-user rate limit", async () => {
    rateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetSeconds: 42,
    });
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name: "delete_recipe",
      arguments: { id: "r1" },
    });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain("42 seconds");
    expect(rateLimit).toHaveBeenCalledWith("mcp-write:user:user-1", 30, 60);
    expect(deleteRecipe).not.toHaveBeenCalled();
  });

  it("fails open when the rate limiter is unavailable", async () => {
    rateLimit.mockRejectedValue(new Error("redis down"));
    listRecipes.mockResolvedValue({ recipes: [], nextOffset: null });
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name: "list_recipes",
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    expect(captureError).toHaveBeenCalled();
  });

  it("imports a link and returns the saved recipe", async () => {
    importRecipeForUser.mockResolvedValue({
      status: "saved",
      recipeId: "r5",
      jobId: "j1",
    });
    getRecipe.mockResolvedValue({ id: "r5", title: "Borscht" });
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name: "import_recipe",
      arguments: { url: "https://example.com/borscht" },
    });

    expect(importRecipeForUser).toHaveBeenCalledWith(
      "user-1",
      "https://example.com/borscht",
    );
    expect(resultJson(result)).toEqual({
      status: "saved",
      recipe: { id: "r5", title: "Borscht" },
    });
  });

  it("tells the model to poll a pending import", async () => {
    importRecipeForUser.mockResolvedValue({ status: "pending", jobId: "j2" });
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name: "import_recipe",
      arguments: { url: "https://example.com/new" },
    });
    expect(resultJson(result)).toMatchObject({
      status: "pending",
      jobId: "j2",
    });
  });

  it("rejects non-http import links", async () => {
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name: "import_recipe",
      arguments: { url: "file:///etc/passwd" },
    });
    expect(result.isError).toBe(true);
    expect(importRecipeForUser).not.toHaveBeenCalled();
  });

  it("reports the parse budget as a tool error", async () => {
    importRecipeForUser.mockResolvedValue({
      status: "rate_limited",
      retryAfterSeconds: 600,
    });
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name: "import_recipe",
      arguments: { url: "https://example.com/x" },
    });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain("10 minutes");
  });

  it("returns the recipe once an import is done", async () => {
    getImportStatus.mockResolvedValue({
      status: "done",
      url: "u",
      recipeId: "r7",
    });
    getRecipe.mockResolvedValue({ id: "r7" });
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name: "get_import_status",
      arguments: { jobId: "j3" },
    });
    expect(getImportStatus).toHaveBeenCalledWith("user-1", "j3");
    expect(resultJson(result)).toEqual({
      status: "done",
      recipe: { id: "r7" },
    });
  });
});
