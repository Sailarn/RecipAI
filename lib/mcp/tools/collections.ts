import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import {
  createCollection,
  listCollections,
  setCollectionMembership,
} from "@/lib/recipes/collections";
import {
  collectionEmojiSchema,
  collectionNameSchema,
} from "@/lib/recipes/input";
import { instrumentTool, type McpToolContext } from "../context";
import { errorResult, jsonResult, NOT_FOUND_MESSAGE } from "../tool-result";
import { recipeIdSchema } from "./read-recipes";

const collectionIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .describe("The collection's id.");

const COLLECTION_NOT_FOUND =
  "Collection not found. Use list_collections to look up its id.";

export function registerCollectionTools(
  server: McpServer,
  context: McpToolContext,
): void {
  const { caller } = context;
  const writeAnnotations = {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  };

  server.registerTool(
    "list_collections",
    {
      title: "List collections",
      description:
        "List the user's recipe collections (named groups) with recipe counts.",
      annotations: {
        title: "List collections",
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    instrumentTool("list_collections", "read", context, async () =>
      jsonResult({ collections: await listCollections(caller.userId) }),
    ),
  );

  server.registerTool(
    "create_collection",
    {
      title: "Create a collection",
      description:
        "Create a recipe collection. If one with the same name exists, it is " +
        "returned instead.",
      inputSchema: {
        name: collectionNameSchema,
        emoji: collectionEmojiSchema
          .optional()
          .describe("One emoji shown with the collection, e.g. 🍰."),
      },
      annotations: { ...writeAnnotations, title: "Create a collection" },
    },
    instrumentTool(
      "create_collection",
      "write",
      context,
      async ({ name, emoji }) =>
        jsonResult(await createCollection(caller.userId, name, emoji)),
    ),
  );

  for (const [name, member] of [
    ["add_to_collection", true],
    ["remove_from_collection", false],
  ] as const) {
    const title = member
      ? "Add a recipe to a collection"
      : "Remove a recipe from a collection";
    server.registerTool(
      name,
      {
        title,
        description: member
          ? "Add one of the user's recipes to one of their collections."
          : "Remove a recipe from a collection. The recipe itself is kept.",
        inputSchema: {
          recipeId: recipeIdSchema,
          collectionId: collectionIdSchema,
        },
        annotations: { ...writeAnnotations, title },
      },
      instrumentTool(
        name,
        "write",
        context,
        async ({ recipeId, collectionId }) => {
          const result = await setCollectionMembership(
            caller.userId,
            recipeId,
            collectionId,
            member,
          );
          if (!result.ok) {
            return errorResult(
              result.missing === "recipe"
                ? NOT_FOUND_MESSAGE
                : COLLECTION_NOT_FOUND,
            );
          }
          return jsonResult({ recipeId, collectionIds: result.collectionIds });
        },
      ),
    );
  }
}
