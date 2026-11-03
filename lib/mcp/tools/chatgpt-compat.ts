import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { getRecipe, listRecipes } from "@/lib/recipes/queries";
import { recipeAsText } from "@/lib/recipes/view";
import { instrumentTool, type McpToolContext } from "../context";
import { errorResult, jsonResult, NOT_FOUND_MESSAGE } from "../tool-result";
import { recipeIdSchema } from "./read-recipes";

const SEARCH_RESULT_LIMIT = 20;

/**
 * `search` and `fetch` in the fixed shapes ChatGPT's connectors and deep
 * research look for: search returns `{ results: [{ id, title, url }] }`, and
 * fetch returns one document `{ id, title, text, url, metadata }`. Both are
 * read-only views over the same owner-scoped queries as list_recipes and
 * get_recipe; other clients can use either pair.
 */
export function registerChatGptCompatTools(
  server: McpServer,
  context: McpToolContext,
): void {
  const { caller, origin } = context;

  server.registerTool(
    "search",
    {
      title: "Search recipes",
      description:
        "Search the user's RecipAI recipes by words in the title, " +
        "description or ingredients. Returns ids to pass to fetch.",
      inputSchema: {
        query: z.string().trim().max(200).describe("Search words."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    instrumentTool("search", "read", context, async ({ query }) => {
      const page = await listRecipes(caller.userId, origin, {
        query,
        limit: SEARCH_RESULT_LIMIT,
      });
      return jsonResult({
        results: page.recipes.map((recipe) => ({
          id: recipe.id,
          title: recipe.title,
          url: recipe.url,
        })),
      });
    }),
  );

  server.registerTool(
    "fetch",
    {
      title: "Fetch a recipe",
      description:
        "Fetch one of the user's recipes as a document, by an id from search.",
      inputSchema: { id: recipeIdSchema },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    instrumentTool("fetch", "read", context, async ({ id }) => {
      const recipe = await getRecipe(caller.userId, id, origin);
      if (!recipe) return errorResult(NOT_FOUND_MESSAGE);
      return jsonResult({
        id: recipe.id,
        title: recipe.title,
        text: recipeAsText(recipe),
        url: recipe.url,
        metadata: {
          category: recipe.category,
          servings: recipe.servings,
          totalTimeMinutes: recipe.totalTimeMinutes,
          sourceUrl: recipe.sourceUrl,
          updatedAt: recipe.updatedAt,
        },
      });
    }),
  );
}
