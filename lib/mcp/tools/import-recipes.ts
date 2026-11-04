import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import {
  getImportStatus,
  importRecipeForUser,
} from "@/lib/parse-recipe/server-import";
import { getRecipe } from "@/lib/recipes/queries";
import { instrumentTool, type McpToolContext } from "../context";
import { errorResult, jsonResult } from "../tool-result";

const importUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => /^https?:\/\//i.test(value) && URL.canParse(value), {
    message: "must be an http(s) URL",
  })
  .describe(
    "Link to a recipe page, or an Instagram, TikTok, YouTube or X post.",
  );

export const IMPORT_FALLBACK_HINT =
  "Instead, save the recipe with create_recipe from the recipe text you have " +
  "(read the page yourself, or ask the user to paste the recipe), with " +
  "sourceUrl set to the link.";

export function registerImportTools(
  server: McpServer,
  context: McpToolContext,
): void {
  const { caller, origin } = context;

  server.registerTool(
    "import_recipe",
    {
      title: "Import a recipe from a link",
      description:
        "Import a recipe from an Instagram, TikTok, YouTube or X post using " +
        "RecipAI's parser, which transcribes the video. Also works for recipe " +
        "web pages you cannot open yourself; for a page you can read, saving " +
        "it with create_recipe is faster and more reliable. Usually finishes " +
        'within a minute: if the result is "pending", check it with ' +
        "get_import_status. Links already in the library are not imported twice. " +
        "Docs: https://recip-ai-wine.vercel.app/connector",
      inputSchema: { url: importUrlSchema },
      annotations: {
        title: "Import a recipe from a link",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    instrumentTool("import_recipe", "write", context, async ({ url }) => {
      const outcome = await importRecipeForUser(caller.userId, url);
      switch (outcome.status) {
        case "rate_limited":
          return errorResult(
            `The user's hourly import limit is reached (try again in ${Math.ceil(outcome.retryAfterSeconds / 60)} minutes). ${IMPORT_FALLBACK_HINT}`,
          );
        case "pending":
          return jsonResult({
            status: "pending",
            jobId: outcome.jobId,
            next: "Call get_import_status with this jobId in a few seconds.",
          });
        default:
          return jsonResult({
            status: outcome.status,
            recipe: await getRecipe(caller.userId, outcome.recipeId, origin),
          });
      }
    }),
  );

  server.registerTool(
    "get_import_status",
    {
      title: "Check a link import",
      description:
        "Check a pending import_recipe job. When done, returns the saved recipe.",
      inputSchema: {
        jobId: z
          .string()
          .trim()
          .min(1)
          .max(128)
          .describe("From import_recipe."),
      },
      annotations: {
        title: "Check a link import",
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    instrumentTool("get_import_status", "read", context, async ({ jobId }) => {
      const status = await getImportStatus(caller.userId, jobId);
      if (!status) return errorResult("Import job not found.");
      if (status.status === "failed") {
        return jsonResult({ ...status, next: IMPORT_FALLBACK_HINT });
      }
      if (status.status === "done" && status.recipeId) {
        return jsonResult({
          status: "done",
          recipe: await getRecipe(caller.userId, status.recipeId, origin),
        });
      }
      return jsonResult(status);
    }),
  );
}
