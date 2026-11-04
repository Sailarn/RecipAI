import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { getRecipe, listRecipes, MAX_LIST_LIMIT } from "@/lib/recipes/queries";
import { recipeAsText } from "@/lib/recipes/view";
import { instrumentTool, type McpToolContext } from "../context";
import { errorResult, jsonResult, NOT_FOUND_MESSAGE } from "../tool-result";

export const recipeIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .describe("The recipe's id.");

/**
 * The two read tools, in the shapes ChatGPT's connectors and deep research
 * require (`search` → `{ results: [{ id, title, url }] }`, `fetch` →
 * `{ id, title, text, url, metadata }`), with extra fields so Claude and other
 * clients get everything from the same pair: no duplicate read tools.
 */
export function registerReadRecipeTools(
  server: McpServer,
  context: McpToolContext,
): void {
  const { caller, origin } = context;

  server.registerTool(
    "search",
    {
      title: "Search recipes",
      description:
        "Searches the user's RecipAI recipes. Words match the title, " +
        "description, ingredient names and collection names (every word must " +
        `match); an empty query lists the newest recipes. Up to ${MAX_LIST_LIMIT} ` +
        "results, each with its recipe id.",
      inputSchema: {
        query: z
          .string()
          .trim()
          .max(200)
          .describe('Search words, e.g. "chicken soup", "desserts" or "борщ".'),
      },
      annotations: {
        title: "Search recipes",
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    instrumentTool("search", "read", context, async ({ query }) => {
      const page = await listRecipes(caller.userId, origin, {
        query,
        limit: MAX_LIST_LIMIT,
      });
      return jsonResult({
        results: page.recipes.map((recipe) => ({
          id: recipe.id,
          title: recipe.title,
          url: recipe.url,
          category: recipe.category,
          servings: recipe.servings,
          totalTimeMinutes: recipe.totalTimeMinutes,
          tried: recipe.tried,
        })),
      });
    }),
  );

  server.registerTool(
    "fetch",
    {
      title: "Get a recipe",
      description:
        "Returns one of the user's recipes by id: `text` is the readable recipe, " +
        "`metadata` the full structured recipe (ingredients with amounts, units " +
        "and sections, numbered steps, times, servings, source, collections, " +
        "photo).",
      inputSchema: { id: recipeIdSchema },
      annotations: {
        title: "Get a recipe",
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    instrumentTool("fetch", "read", context, async ({ id }) => {
      const recipe = await getRecipe(caller.userId, id, origin);
      if (!recipe) return errorResult(NOT_FOUND_MESSAGE);
      return jsonResult({
        id: recipe.id,
        title: recipe.title,
        text: recipeAsText(recipe),
        url: recipe.url,
        metadata: recipe,
      });
    }),
  );
}
