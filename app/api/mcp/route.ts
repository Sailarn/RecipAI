import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { ApiError } from "@/lib/api-errors";
import {
  authenticateMcpRequest,
  MCP_CORS_HEADERS,
  unauthorizedResponse,
} from "@/lib/mcp/auth";
import { appOrigin } from "@/lib/mcp/config";
import { createRecipaiMcpServer } from "@/lib/mcp/server";

// The RecipAI connector: a remote MCP server (Streamable HTTP, stateless,
// JSON responses) that AI chat apps call with an OAuth bearer token.
// See docs/specs/ai-connector.md.
export const maxDuration = 60;

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(MCP_CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handle(req: Request): Promise<Response> {
  const caller = await authenticateMcpRequest(req);
  if (!caller) return unauthorizedResponse();

  try {
    const server = createRecipaiMcpServer({ caller, origin: appOrigin() });
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    return withCors(await transport.handleRequest(req));
  } catch (error) {
    ApiError.capture(error);
    return withCors(
      Response.json(
        {
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        },
        { status: 500 },
      ),
    );
  }
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: MCP_CORS_HEADERS });
}
