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
const listCollections = vi.hoisted(() => vi.fn());
const createCollection = vi.hoisted(() => vi.fn());
const setCollectionMembership = vi.hoisted(() => vi.fn());
const getImportStatus = vi.hoisted(() => vi.fn());
const rateLimit = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ allowed: true, remaining: 1, resetSeconds: 60 }),
);

vi.mock("@/lib/telemetry", () => ({ captureError, trackEvent, log: vi.fn() }));
vi.mock("@/lib/parse-recipe/server-import", () => ({
  importRecipeForUser,
  getImportStatus,
}));
vi.mock("@/lib/recipes/collections", () => ({
  listCollections,
  createCollection,
  setCollectionMembership,
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/recipes/mutations", () => ({
  createRecipe,
  updateRecipe,
  deleteRecipe,
}));

import { createRecipaiMcpServer, MCP_SERVER_INSTRUCTIONS } from "../server";
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

    expect(byName.search.annotations?.readOnlyHint).toBe(true);
    expect(byName.fetch.annotations?.readOnlyHint).toBe(true);
    expect(byName).not.toHaveProperty("list_recipes");
    expect(byName).not.toHaveProperty("get_recipe");
  });

  it("gives every tool a title and a read-only or destructive hint (Claude directory rule)", async () => {
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const { tools } = await client.listTools();

    for (const tool of tools) {
      expect(tool.title, tool.name).toBeTruthy();
      // The directory portal reads the title from the annotations.
      expect(tool.annotations?.title, tool.name).toBe(tool.title);
      const hints = tool.annotations ?? {};
      expect(
        hints.readOnlyHint === true || hints.destructiveHint === true,
        `${tool.name} needs readOnlyHint or destructiveHint`,
      ).toBe(true);
    }
  });

  it("scopes search to the token's user, never to tool input", async () => {
    listRecipes.mockResolvedValue({ recipes: [], nextOffset: null });
    const client = await connectTestClient(createRecipaiMcpServer(context));

    const result = await client.callTool({
      name: "search",
      arguments: { query: "soup", userId: "someone-else" },
    });

    expect(listRecipes).toHaveBeenCalledWith(
      "user-1",
      "https://app.example",
      expect.objectContaining({ query: "soup" }),
    );
    expect(resultJson(result)).toEqual({ results: [] });
    expect(trackEvent).toHaveBeenCalledWith("mcp_tool_called", {
      tool: "search",
      client: "Claude",
      ok: true,
    });
  });

  it("rejects invalid input before reaching the database", async () => {
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name: "search",
      arguments: { query: "x".repeat(500) },
    });

    expect(result.isError).toBe(true);
    expect(listRecipes).not.toHaveBeenCalled();
  });

  it("reports a missing recipe as a tool error", async () => {
    getRecipe.mockResolvedValue(null);
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name: "fetch",
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
      name: "fetch",
      arguments: { id: "r1" },
    });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).not.toContain("db down");
    expect(captureError).toHaveBeenCalled();
  });

  it("marks every write as destructive", async () => {
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const { tools } = await client.listTools();
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

    expect(byName.delete_recipe.annotations?.destructiveHint).toBe(true);
    expect(byName.create_recipe.annotations?.destructiveHint).toBe(true);
    expect(byName.update_recipe.annotations?.destructiveHint).toBe(true);
    expect(byName.import_recipe.annotations?.destructiveHint).toBe(true);
    expect(byName.add_to_collection.annotations?.destructiveHint).toBe(true);
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
      name: "search",
      arguments: { query: "" },
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

  it("lists the caller's collections", async () => {
    listCollections.mockResolvedValue([
      { id: "c1", name: "Soups", emoji: "🍲", recipeCount: 2 },
    ]);
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name: "list_collections",
      arguments: {},
    });

    expect(listCollections).toHaveBeenCalledWith("user-1");
    expect(resultJson(result)).toEqual({
      collections: [{ id: "c1", name: "Soups", emoji: "🍲", recipeCount: 2 }],
    });
  });

  it.each([
    ["add_to_collection", true],
    ["remove_from_collection", false],
  ] as const)("%s sets membership for the caller", async (name, member) => {
    setCollectionMembership.mockResolvedValue({
      ok: true,
      collectionIds: ["c1"],
    });
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name,
      arguments: { recipeId: "r1", collectionId: "c1" },
    });

    expect(setCollectionMembership).toHaveBeenCalledWith(
      "user-1",
      "r1",
      "c1",
      member,
    );
    expect(resultJson(result)).toEqual({
      recipeId: "r1",
      collectionIds: ["c1"],
    });
  });

  it("names what is missing when membership can't be set", async () => {
    setCollectionMembership.mockResolvedValue({
      ok: false,
      missing: "collection",
    });
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name: "add_to_collection",
      arguments: { recipeId: "r1", collectionId: "nope" },
    });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain("Collection not found");
  });

  it("serves ChatGPT's search shape with extra recipe fields", async () => {
    listRecipes.mockResolvedValue({
      recipes: [
        {
          id: "r1",
          title: "Borscht",
          url: "https://app.example/recipes/r1",
          category: "Soup",
          servings: 4,
          totalTimeMinutes: 60,
          tried: true,
          updatedAt: "2026-11-01T00:00:00.000Z",
        },
      ],
      nextOffset: null,
    });
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name: "search",
      arguments: { query: "beet" },
    });

    expect(listRecipes).toHaveBeenCalledWith("user-1", "https://app.example", {
      query: "beet",
      limit: 50,
    });
    expect(resultJson(result)).toEqual({
      results: [
        {
          id: "r1",
          title: "Borscht",
          url: "https://app.example/recipes/r1",
          category: "Soup",
          servings: 4,
          totalTimeMinutes: 60,
          tried: true,
        },
      ],
    });
  });

  it("serves ChatGPT's fetch shape with the full recipe as metadata", async () => {
    getRecipe.mockResolvedValue({
      id: "r1",
      title: "Borscht",
      url: "https://app.example/recipes/r1",
      description: null,
      category: "Soup",
      servings: 4,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      totalTimeMinutes: 60,
      sourceUrl: null,
      updatedAt: "2026-11-01T00:00:00.000Z",
      ingredients: [{ item: "beet", amount: 2 }],
      instructions: [{ step: 1, instruction: "Boil" }],
    });
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const document = resultJson(
      await client.callTool({ name: "fetch", arguments: { id: "r1" } }),
    ) as Record<string, unknown>;

    expect(document).toMatchObject({
      id: "r1",
      title: "Borscht",
      url: "https://app.example/recipes/r1",
      metadata: { category: "Soup", servings: 4 },
    });
    expect(document.text).toContain("# Borscht");
    expect(document.text).toContain("- 2 beet");
  });

  it("returns update_recipe's result with any warnings", async () => {
    updateRecipe.mockResolvedValue({
      recipe: { id: "r1" },
      warnings: ["The photo could not be copied"],
    });
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = await client.callTool({
      name: "update_recipe",
      arguments: { id: "r1", imageUrl: "https://img.example.com/a.jpg" },
    });

    expect(updateRecipe).toHaveBeenCalledWith(
      "user-1",
      "r1",
      { imageUrl: "https://img.example.com/a.jpg" },
      "https://app.example",
    );
    expect(resultJson(result)).toEqual({
      recipe: { id: "r1" },
      warnings: ["The photo could not be copied"],
    });
  });

  it("points the model to create_recipe when an import fails", async () => {
    getImportStatus.mockResolvedValue({
      status: "failed",
      url: "https://example.com/x",
      error: "Couldn't extract a recipe from this page",
    });
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const result = resultJson(
      await client.callTool({
        name: "get_import_status",
        arguments: { jobId: "j9" },
      }),
    ) as { status: string; next: string };

    expect(result.status).toBe("failed");
    expect(result.next).toContain("create_recipe");
  });

  it("tells the model to parse links itself and import only social posts", async () => {
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const { tools } = await client.listTools();
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

    expect(byName.import_recipe.description).toMatch(
      /Instagram, TikTok, YouTube or X/,
    );
    expect(MCP_SERVER_INSTRUCTIONS).toMatch(/photo or screenshot/);
  });

  it("keeps workflow advice out of tool descriptions (Claude directory rule)", async () => {
    const client = await connectTestClient(createRecipaiMcpServer(context));
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name);

    for (const tool of tools) {
      const text = JSON.stringify({
        description: tool.description,
        inputSchema: tool.inputSchema,
      });
      for (const other of names) {
        if (other === tool.name) continue;
        expect(text, `${tool.name} mentions ${other}`).not.toMatch(
          new RegExp(`\\b${other}\\b`),
        );
      }
    }
  });
});
