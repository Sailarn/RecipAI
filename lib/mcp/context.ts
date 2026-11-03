import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { MCP_RATE_LIMIT } from "@/lib/api-limits";
import { rateLimit } from "@/lib/rate-limit";
import { captureError, log, trackEvent } from "@/lib/telemetry";
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

export type ToolKind = "read" | "write";

/**
 * Per-user rate limit for one tool call. Fails open when Redis is unavailable,
 * like every other limiter in the app. Returns a tool error when exceeded.
 */
async function checkRateLimit(
  kind: ToolKind,
  userId: string,
): Promise<CallToolResult | null> {
  const { limit, windowSeconds } =
    kind === "read" ? MCP_RATE_LIMIT.READ : MCP_RATE_LIMIT.WRITE;
  try {
    const result = await rateLimit(
      `mcp-${kind}:user:${userId}`,
      limit,
      windowSeconds,
    );
    if (result.allowed) return null;
    log("warn", "rate_limit_hit", { caller_type: "user", source: "mcp" });
    trackEvent("rate_limit_hit", { caller_type: "user" });
    return errorResult(
      `Too many RecipAI requests. Try again in ${result.resetSeconds} seconds.`,
    );
  } catch (error) {
    captureError(error, { tags: { source: "mcp-rate-limit" } });
    return null;
  }
}

/**
 * Wrap a tool handler: enforce the per-user rate limit, report usage, and
 * turn unexpected failures into a tool error (captured to Sentry) instead of
 * a broken JSON-RPC response.
 */
export function instrumentTool<Args>(
  tool: string,
  kind: ToolKind,
  context: McpToolContext,
  handler: (args: Args) => Promise<CallToolResult>,
): (args: Args) => Promise<CallToolResult> {
  const report = (ok: boolean) =>
    trackEvent("mcp_tool_called", {
      tool,
      client: context.caller.clientName,
      ok,
    });

  return async (args) => {
    const limited = await checkRateLimit(kind, context.caller.userId);
    if (limited) {
      report(false);
      return limited;
    }
    try {
      const result = await handler(args);
      report(!result.isError);
      return result;
    } catch (error) {
      captureError(error, { tags: { source: "mcp", tool } });
      report(false);
      return errorResult("Something went wrong in RecipAI. Try again later.");
    }
  };
}
