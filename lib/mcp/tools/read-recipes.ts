import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import { RECIPE_CATEGORIES } from "@/lib/categories";
import {
  DEFAULT_LIST_LIMIT,
  getRecipe,
  listRecipes,
  MAX_LIST_LIMIT,
} from "@/lib/recipes/queries";
import { instrumentTool, type McpToolContext } from "../context";
import { errorResult, jsonResult, NOT_FOUND_MESSAGE } from "../tool-result";

export const recipeIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .describe("Recipe id, as returned by list_recipes.");

export function registerReadRecipeTools(
  server: McpServer,
  context: McpToolContext,
): void {
  const { caller, origin } = context;

  server.registerTool(
    "list_recipes",
    {
      title: "List or search recipes",
      description:
        "List the user's saved RecipAI recipes, newest first, or search them. " +
        "`query` matches words in the title, description and ingredient names " +
        "(every word must match). Returns ids for get_recipe.",
      inputSchema: {
        query: z
          .string()
          .trim()
          .max(200)
          .optional()
          .describe('Search words, e.g. "chicken soup" or "борщ".'),
        category: z
          .enum(RECIPE_CATEGORIES)
          .optional()
          .describe("Only recipes in this category."),
        collectionId: z
          .string()
          .trim()
          .max(128)
          .optional()
          .describe("Only recipes in this collection (see list_collections)."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_LIST_LIMIT)
          .optional()
          .describe(`Page size, default ${DEFAULT_LIST_LIMIT}.`),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Pagination offset; pass the previous nextOffset."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    instrumentTool("list_recipes", "read", context, async (args) =>
      jsonResult(await listRecipes(caller.userId, origin, args)),
    ),
  );

  server.registerTool(
    "get_recipe",
    {
      title: "Get a recipe",
      description:
        "Get one of the user's recipes in full: ingredients (with amounts, " +
        "units and section names), numbered steps, times, servings, source " +
        "and collections.",
      inputSchema: { id: recipeIdSchema },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    instrumentTool("get_recipe", "read", context, async ({ id }) => {
      const recipe = await getRecipe(caller.userId, id, origin);
      return recipe ? jsonResult(recipe) : errorResult(NOT_FOUND_MESSAGE);
    }),
  );
}
