import { type NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/require-session";
import { listConnections, revokeConnections } from "@/lib/mcp/connections";

const MAX_CLIENT_IDS = 50;

// The signed-in user's connected AI apps (Claude, ChatGPT…), for the Ask AI
// button and the profile's disconnect rows.
export async function GET(req: NextRequest) {
  const authed = await requireSession();
  if (authed.response) return authed.response;

  try {
    return NextResponse.json({
      connections: await listConnections(authed.session.user.id),
    });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}

export async function DELETE(req: NextRequest) {
  const authed = await requireSession();
  if (authed.response) return authed.response;

  let body: { clientIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { clientIds } = body;
  if (
    !Array.isArray(clientIds) ||
    clientIds.length === 0 ||
    clientIds.length > MAX_CLIENT_IDS ||
    !clientIds.every((id) => typeof id === "string" && id.length > 0)
  ) {
    return ApiError.badRequest("clientIds must be a non-empty string array");
  }

  try {
    const revoked = await revokeConnections(authed.session.user.id, clientIds);
    return NextResponse.json({ revoked });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
