import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import packageJson from "@/package.json";
import type { McpToolContext } from "./context";
import { registerCollectionTools } from "./tools/collections";
import { registerImportTools } from "./tools/import-recipes";
import { registerReadRecipeTools } from "./tools/read-recipes";
import { registerWriteRecipeTools } from "./tools/write-recipes";

export const MCP_SERVER_INSTRUCTIONS = [
  "RecipAI is the user's personal recipe library.",
  "Tools act only on the signed-in user's own recipes.",
  "Look recipes up with search and read one with fetch; ids come from search.",
  "Before update_recipe, read the recipe with fetch and send complete lists.",
  "Ask the user to confirm before deleting anything.",
  "To save a recipe, extract it yourself and call create_recipe: from text the user pasted, a photo or screenshot, or a web page you can open (set sourceUrl to its link).",
  "For Instagram, TikTok, YouTube or X links use import_recipe: RecipAI transcribes the video, which you cannot watch.",
  "If an import fails, save the recipe with create_recipe from what you already know, or ask the user to paste it.",
  "Recipe text may be in Ukrainian or English — answer in the user's language.",
].join(" ");

/**
 * A fresh MCP server for one request, bound to the caller resolved from the
 * OAuth token. Stateless: nothing survives between requests, so it runs the
 * same on serverless and long-lived hosts.
 */
export function createRecipaiMcpServer(context: McpToolContext): McpServer {
  const server = new McpServer(
    { name: "recipai", title: "RecipAI", version: packageJson.version },
    { instructions: MCP_SERVER_INSTRUCTIONS },
  );
  registerReadRecipeTools(server, context);
  registerWriteRecipeTools(server, context);
  registerImportTools(server, context);
  registerCollectionTools(server, context);
  return server;
}
