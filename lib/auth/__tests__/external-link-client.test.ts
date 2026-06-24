import { describe, expect, it } from "vitest";
import { externalLinkClient } from "../external-link-client";

describe("externalLinkClient", () => {
  it("declares POST for every route so body-less calls don't fall back to GET", () => {
    // generate() and cleanup() take no arguments; without explicit pathMethods
    // the client proxy would send GET and the POST-only routes would 404.
    const { pathMethods } = externalLinkClient();

    expect(pathMethods["/external-link/generate"]).toBe("POST");
    expect(pathMethods["/external-link/cleanup"]).toBe("POST");
    expect(pathMethods["/external-link/redeem"]).toBe("POST");
    expect(pathMethods["/external-link/device-session"]).toBe("POST");
  });
});
