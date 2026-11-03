import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { captureError, trackEvent } from "@/lib/telemetry";
import { errorResult } from "./tool-result";

/** Who is calling: resolved from the OAuth access token, never from tool input. */
export interface McpCaller {
  userId: string;
  clientId: string;
  /** Display name the client registered with ("Claude", "ChatGPT"…). */
  clientName: string;
}

export interface McpToolContext {
  caller: McpCaller;
  /** Public app origin, for links back into RecipAI. */
  origin: string;
}

/**
 * Wrap a tool handler: report usage, and turn unexpected failures into a
 * tool error (captured to Sentry) instead of a broken JSON-RPC response.
 */
export function instrumentTool<Args>(
  tool: string,
  context: McpToolContext,
  handler: (args: Args) => Promise<CallToolResult>,
): (args: Args) => Promise<CallToolResult> {
  return async (args) => {
    try {
      const result = await handler(args);
      trackEvent("mcp_tool_called", {
        tool,
        client: context.caller.clientName,
        ok: !result.isError,
      });
      return result;
    } catch (error) {
      captureError(error, { tags: { source: "mcp", tool } });
      trackEvent("mcp_tool_called", {
        tool,
        client: context.caller.clientName,
        ok: false,
      });
      return errorResult("Something went wrong in RecipAI. Try again later.");
    }
  };
}
