import { describe, expect, it } from "vitest";
import { forceMcpConsent } from "../mcp-consent";

describe("forceMcpConsent", () => {
  it("forces prompt=consent on the mcp authorize endpoint", () => {
    expect(
      forceMcpConsent({
        path: "/mcp/authorize",
        query: { client_id: "abc", response_type: "code" },
      }),
    ).toEqual({
      context: {
        query: { client_id: "abc", response_type: "code", prompt: "consent" },
      },
    });
  });

  it("overrides a client-supplied prompt that would skip consent", () => {
    expect(
      forceMcpConsent({ path: "/mcp/authorize", query: { prompt: "none" } })
        ?.context.query.prompt,
    ).toBe("consent");
  });

  it("leaves every other endpoint untouched", () => {
    expect(
      forceMcpConsent({ path: "/sign-in/social", query: { prompt: "none" } }),
    ).toBeUndefined();
    expect(forceMcpConsent({ path: "/mcp/token" })).toBeUndefined();
  });
});
