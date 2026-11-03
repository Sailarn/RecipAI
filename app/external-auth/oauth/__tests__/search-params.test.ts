import { describe, expect, it } from "vitest";
import { firstParam, toQueryString } from "../search-params";

describe("connector OAuth search params", () => {
  it("rebuilds the authorize query, keeping repeated keys and encoding", () => {
    expect(
      toQueryString({
        client_id: "abc",
        redirect_uri: "https://claude.ai/api/mcp/auth_callback",
        scope: "openid offline_access",
        resource: ["a", "b"],
        missing: undefined,
      }),
    ).toBe(
      "client_id=abc&redirect_uri=https%3A%2F%2Fclaude.ai%2Fapi%2Fmcp%2Fauth_callback&scope=openid+offline_access&resource=a&resource=b",
    );
  });

  it("reads the first value of a param", () => {
    expect(firstParam({ a: ["1", "2"] }, "a")).toBe("1");
    expect(firstParam({ a: "x" }, "a")).toBe("x");
    expect(firstParam({}, "a")).toBeUndefined();
  });
});
