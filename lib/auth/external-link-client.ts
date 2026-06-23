import type { externalLink } from "./external-link-plugin";

export function externalLinkClient() {
  return {
    id: "external-link",
    $InferServerPlugin: {} as ReturnType<typeof externalLink>,
  };
}
