import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import packageJson from "@/package.json";
import type { McpToolContext } from "./context";
import { registerReadRecipeTools } from "./tools/read-recipes";
import { registerWriteRecipeTools } from "./tools/write-recipes";

export const MCP_SERVER_INSTRUCTIONS = [
  "RecipAI is the user's personal recipe library.",
  "Tools act only on the signed-in user's own recipes.",
  "Look recipes up with list_recipes before get_recipe; ids come from there.",
  "Before update_recipe, read the recipe with get_recipe and send complete lists.",
  "Ask the user to confirm before deleting anything.",
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
  return server;
}
