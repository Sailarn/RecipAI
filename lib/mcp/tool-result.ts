import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/** A successful tool result carrying JSON the model can read. */
export function jsonResult(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

/**
 * A tool-level error the model should see and can recover from (bad id, not
 * found, rate limited). Protocol errors are reserved for broken requests.
 */
export function errorResult(message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

export const NOT_FOUND_MESSAGE =
  "Recipe not found. Use search to look up the recipe's id.";
