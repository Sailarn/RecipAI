import { APIError } from "better-auth/api";
import { describe, expect, it, vi } from "vitest";
import {
  forceMcpConsent,
  isAwaitingConsent,
  rejectUnconsentedCode,
  rotateRefreshToken,
} from "../mcp-consent";

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

describe("rejectUnconsentedCode", () => {
  function context(path: string, body: unknown, stored: string | null) {
    const findVerificationValue = vi
      .fn()
      .mockResolvedValue(stored === null ? null : { value: stored });
    return {
      ctx: {
        path,
        body,
        context: { internalAdapter: { findVerificationValue } },
      },
      findVerificationValue,
    };
  }

  it("refuses a code that is still waiting for consent", async () => {
    const { ctx } = context(
      "/mcp/token",
      { grant_type: "authorization_code", code: "C1" },
      JSON.stringify({ requireConsent: true }),
    );
    await expect(rejectUnconsentedCode(ctx)).rejects.toMatchObject({
      status: "UNAUTHORIZED",
    });
  });

  it("reads form-encoded bodies too", async () => {
    const form = new FormData();
    form.set("grant_type", "authorization_code");
    form.set("code", "C1");
    const { ctx } = context(
      "/mcp/token",
      form,
      JSON.stringify({ requireConsent: true }),
    );
    await expect(rejectUnconsentedCode(ctx)).rejects.toBeDefined();
  });

  it("lets consented codes through", async () => {
    const { ctx } = context(
      "/mcp/token",
      { grant_type: "authorization_code", code: "C2" },
      JSON.stringify({ requireConsent: false }),
    );
    await expect(rejectUnconsentedCode(ctx)).resolves.toBeUndefined();
  });

  it("ignores refresh grants, unknown codes and other endpoints", async () => {
    const refresh = context(
      "/mcp/token",
      { grant_type: "refresh_token", refresh_token: "R" },
      null,
    );
    await rejectUnconsentedCode(refresh.ctx);
    expect(refresh.findVerificationValue).not.toHaveBeenCalled();

    const unknown = context(
      "/mcp/token",
      { grant_type: "authorization_code", code: "nope" },
      null,
    );
    await expect(rejectUnconsentedCode(unknown.ctx)).resolves.toBeUndefined();

    const other = context("/sign-in/social", { code: "C1" }, null);
    await rejectUnconsentedCode(other.ctx);
    expect(other.findVerificationValue).not.toHaveBeenCalled();
  });
});

describe("isAwaitingConsent", () => {
  it("parses the stored authorization request", () => {
    expect(isAwaitingConsent('{"requireConsent":true}')).toBe(true);
    expect(isAwaitingConsent('{"requireConsent":false}')).toBe(false);
    expect(isAwaitingConsent("not json")).toBe(false);
  });
});

describe("rotateRefreshToken", () => {
  function context(path: string, body: unknown, returned: unknown) {
    const remove = vi.fn().mockResolvedValue(undefined);
    return {
      ctx: { path, body, context: { returned, adapter: { delete: remove } } },
      remove,
    };
  }
  const refreshBody = { grant_type: "refresh_token", refresh_token: "OLD" };

  it("deletes the used refresh token once a new pair is issued", async () => {
    const { ctx, remove } = context("/mcp/token", refreshBody, {
      access_token: "new",
      refresh_token: "NEW",
    });
    await rotateRefreshToken(ctx);
    expect(remove).toHaveBeenCalledWith({
      model: "oauthAccessToken",
      where: [{ field: "refreshToken", value: "OLD" }],
    });
  });

  it("keeps the token when the refresh failed", async () => {
    const { ctx, remove } = context(
      "/mcp/token",
      refreshBody,
      new APIError("UNAUTHORIZED", { error: "invalid_grant" }),
    );
    await rotateRefreshToken(ctx);
    expect(remove).not.toHaveBeenCalled();
  });

  it("ignores code exchanges and other endpoints", async () => {
    const code = context(
      "/mcp/token",
      { grant_type: "authorization_code", code: "C" },
      { access_token: "a" },
    );
    await rotateRefreshToken(code.ctx);
    expect(code.remove).not.toHaveBeenCalled();

    const other = context("/sign-in/social", refreshBody, {
      access_token: "a",
    });
    await rotateRefreshToken(other.ctx);
    expect(other.remove).not.toHaveBeenCalled();
  });
});
