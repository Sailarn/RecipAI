import type { externalLink } from "./external-link-plugin";

export function externalLinkClient() {
  return {
    id: "external-link",
    $InferServerPlugin: {} as ReturnType<typeof externalLink>,
    // Without these, the client proxy infers the method from the request body:
    // generate()/cleanup() take no args, so it defaults to GET and the
    // POST-only routes 404. Declare them explicitly so every call uses POST.
    pathMethods: {
      "/external-link/generate": "POST",
      "/external-link/redeem": "POST",
      "/external-link/device-session": "POST",
      "/external-link/cleanup": "POST",
    },
  } as const;
}
