import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createRecipeInputShape,
  updateRecipeInputShape,
} from "@/lib/recipes/input";
import {
  createRecipe,
  deleteRecipe,
  updateRecipe,
} from "@/lib/recipes/mutations";
import { instrumentTool, type McpToolContext } from "../context";
import { errorResult, jsonResult, NOT_FOUND_MESSAGE } from "../tool-result";
import { recipeIdSchema } from "./read-recipes";

const SYNC_NOTE =
  "Changes reach the user's RecipAI app on its next sync (when it is opened " +
  "or refreshed).";

export function registerWriteRecipeTools(
  server: McpServer,
  context: McpToolContext,
): void {
  const { caller, origin } = context;

  server.registerTool(
    "create_recipe",
    {
      title: "Save a new recipe",
      description:
        "Save a new recipe to the user's RecipAI library. Give ingredients as " +
        "separate items with numeric amounts and units, and steps in order. " +
        "Use `section` to group items (e.g. a sauce). If `sourceUrl` is " +
        "already in the library, the existing recipe is returned instead. " +
        SYNC_NOTE,
      inputSchema: createRecipeInputShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    instrumentTool("create_recipe", "write", context, async (input) => {
      const result = await createRecipe(caller.userId, input, origin);
      return jsonResult(result);
    }),
  );

  server.registerTool(
    "update_recipe",
    {
      title: "Edit a recipe",
      description:
        "Change one of the user's recipes. Only the fields you pass change; " +
        "`null` clears a field. `ingredients` and `instructions` replace the " +
        "whole list, so call get_recipe first and send the complete edited " +
        `list. ${SYNC_NOTE}`,
      inputSchema: { id: recipeIdSchema, ...updateRecipeInputShape },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    instrumentTool(
      "update_recipe",
      "write",
      context,
      async ({ id, ...patch }) => {
        const recipe = await updateRecipe(caller.userId, id, patch, origin);
        return recipe ? jsonResult(recipe) : errorResult(NOT_FOUND_MESSAGE);
      },
    ),
  );

  server.registerTool(
    "delete_recipe",
    {
      title: "Delete a recipe",
      description:
        "Permanently delete one of the user's recipes. Confirm with the user " +
        `first; this cannot be undone. ${SYNC_NOTE}`,
      inputSchema: { id: recipeIdSchema },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    instrumentTool("delete_recipe", "write", context, async ({ id }) => {
      const deleted = await deleteRecipe(caller.userId, id);
      return deleted
        ? jsonResult({ deleted: true, ...deleted })
        : errorResult(NOT_FOUND_MESSAGE);
    }),
  );
}
