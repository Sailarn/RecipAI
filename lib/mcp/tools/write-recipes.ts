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
        "Saves a new recipe to the user's RecipAI library. Takes ingredients " +
        "as separate items with numeric amounts and units, and steps in " +
        "order; `section` groups items (e.g. a sauce). `sourceUrl` is the " +
        "original link, if any: a link already in the library returns that " +
        "recipe instead of a duplicate. `imageUrl` is a public photo of the " +
        "dish; steps may carry images too. " +
        SYNC_NOTE,
      inputSchema: createRecipeInputShape,
      annotations: {
        title: "Save a new recipe",
        readOnlyHint: false,
        destructiveHint: true,
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
        "Changes one of the user's recipes. Only the fields passed change; " +
        "`null` clears a field. `ingredients` and `instructions` replace the " +
        `whole list. ${SYNC_NOTE}`,
      inputSchema: { id: recipeIdSchema, ...updateRecipeInputShape },
      annotations: {
        title: "Edit a recipe",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    instrumentTool(
      "update_recipe",
      "write",
      context,
      async ({ id, ...patch }) => {
        const result = await updateRecipe(caller.userId, id, patch, origin);
        return result ? jsonResult(result) : errorResult(NOT_FOUND_MESSAGE);
      },
    ),
  );

  server.registerTool(
    "delete_recipe",
    {
      title: "Delete a recipe",
      description:
        "Permanently deletes one of the user's recipes. This cannot be " +
        `undone. ${SYNC_NOTE}`,
      inputSchema: { id: recipeIdSchema },
      annotations: {
        title: "Delete a recipe",
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
