import { getBuildId } from "@/lib/build-id";

// Which build the server is currently serving. The client compares it against
// the id compiled into its own bundle to tell whether the document it is
// running came from a previous deploy.
//
// Anonymous by design (no session): staleness is a property of the document,
// not the user, and it must be answerable before anything else has resolved.
// The service worker routes /api/* through NetworkOnly, so this is never
// served from cache — which is the whole point of asking over HTTP rather than
// reading a value that would have been baked into the same stale bundle.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { buildId: getBuildId() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
