import { beforeEach, describe, expect, it, vi } from "vitest";

// Shared store so the generate endpoint (adapter.createVerificationValue) and
// the redeem endpoint (atomic db.delete ... returning) operate on the same data.
const { verificationStore, setSessionCookie, deleteSessionCookie } = vi.hoisted(
  () => ({
    verificationStore: new Map<
      string,
      { identifier: string; value: string; expiresAt: Date }
    >(),
    setSessionCookie: vi.fn(),
    deleteSessionCookie: vi.fn(),
  }),
);

vi.mock("better-auth/cookies", () => ({
  setSessionCookie,
  deleteSessionCookie,
}));
vi.mock("drizzle-orm", () => ({
  eq: (_column: unknown, value: unknown) => ({ value }),
}));
vi.mock("@/db/schema/auth", () => ({
  verification: { identifier: "identifier" },
}));
vi.mock("@/db", () => ({
  db: {
    delete: () => ({
      where: (condition: { value: string }) => ({
        returning: async () => {
          const row = verificationStore.get(condition.value);
          if (!row) return [];
          verificationStore.delete(condition.value);
          return [row];
        },
      }),
    }),
  },
}));

import {
  externalLink,
  getExternalLinkExpiry,
  hashExternalLinkToken,
} from "../external-link-plugin";

describe("external link credentials", () => {
  it("stores a deterministic hash instead of the raw token", () => {
    const token = "raw-one-time-token";

    expect(hashExternalLinkToken(token)).not.toContain(token);
    expect(hashExternalLinkToken(token)).toBe(hashExternalLinkToken(token));
  });

  it("expires the temporary session after five minutes", () => {
    const now = new Date("2026-06-23T00:00:00.000Z");

    expect(getExternalLinkExpiry(now)).toEqual(
      new Date("2026-06-23T00:05:00.000Z"),
    );
  });
});

describe("external link endpoints", () => {
  const sessions = new Map<
    string,
    {
      session: { token: string; userId: string; expiresAt: Date };
      user: object;
    }
  >();
  const adapter = {
    createVerificationValue: vi.fn(
      async (verification: {
        identifier: string;
        value: string;
        expiresAt: Date;
      }) => {
        verificationStore.set(verification.identifier, verification);
        return verification;
      },
    ),
    findVerificationValue: vi.fn(async (identifier: string) =>
      verificationStore.get(identifier),
    ),
    deleteVerificationByIdentifier: vi.fn(async (identifier: string) => {
      verificationStore.delete(identifier);
    }),
    createSession: vi.fn(
      async (
        userId: string,
        _remember: boolean,
        values: { expiresAt: Date },
      ) => {
        const session = {
          token: `temporary-${sessions.size + 1}`,
          userId,
          expiresAt: values.expiresAt,
        };
        sessions.set(session.token, { session, user: { id: userId } });
        return session;
      },
    ),
    findSession: vi.fn(async (token: string) => sessions.get(token) ?? null),
    deleteSession: vi.fn(async (token: string) => {
      sessions.delete(token);
    }),
  };

  function context(overrides: Record<string, unknown> = {}) {
    return {
      body: {},
      context: {
        internalAdapter: adapter,
        session: {
          user: { id: "user-1" },
          session: { token: "source-session" },
        },
      },
      json: (value: unknown) => value,
      error: (_status: string, details: { message: string }) =>
        new Error(details.message),
      ...overrides,
    };
  }

  beforeEach(() => {
    verificationStore.clear();
    sessions.clear();
    vi.clearAllMocks();
  });

  it("stores only a token hash bound to the current user", async () => {
    const endpoint = externalLink().endpoints.externalLinkGenerate;

    const result = (await endpoint(context() as never)) as unknown as {
      token: string;
    };

    const [stored] = [...verificationStore.values()];
    expect(stored.value).toBe("user-1");
    expect(stored.identifier).toBe(
      `external-link:${hashExternalLinkToken(result.token)}`,
    );
    expect(stored.identifier).not.toContain(result.token);
  });

  it("deletes the handoff before creating a distinct short-lived session", async () => {
    const plugin = externalLink();
    const generated = (await plugin.endpoints.externalLinkGenerate(
      context() as never,
    )) as unknown as { token: string };

    await plugin.endpoints.externalLinkRedeem(
      context({ body: { token: generated.token } }) as never,
    );

    expect(verificationStore.size).toBe(0);
    const [temporarySession] = [...sessions.values()];
    expect(temporarySession.session.token).not.toBe("source-session");
    expect(temporarySession.session.userId).toBe("user-1");
    expect(temporarySession.session.expiresAt.getTime()).toBeLessThanOrEqual(
      Date.now() + 5 * 60 * 1000,
    );
    expect(setSessionCookie).toHaveBeenCalledOnce();

    await expect(
      plugin.endpoints.externalLinkRedeem(
        context({ body: { token: generated.token } }) as never,
      ),
    ).rejects.toThrow("Invalid or already used");
  });

  it("rejects and consumes an expired handoff", async () => {
    const token = "expired-token";
    const identifier = `external-link:${hashExternalLinkToken(token)}`;
    verificationStore.set(identifier, {
      identifier,
      value: "user-1",
      expiresAt: new Date(Date.now() - 1),
    });

    await expect(
      externalLink().endpoints.externalLinkRedeem(
        context({ body: { token } }) as never,
      ),
    ).rejects.toThrow("expired");
    expect(verificationStore.has(identifier)).toBe(false);
    expect(adapter.createSession).not.toHaveBeenCalled();
  });

  it("cleanup deletes only the session presented by the auth origin", async () => {
    sessions.set("temporary-session", {
      session: {
        token: "temporary-session",
        userId: "user-1",
        expiresAt: getExternalLinkExpiry(),
      },
      user: { id: "user-1" },
    });
    sessions.set("source-session", {
      session: {
        token: "source-session",
        userId: "user-1",
        expiresAt: getExternalLinkExpiry(),
      },
      user: { id: "user-1" },
    });

    await externalLink().endpoints.externalLinkCleanup(
      context({
        context: {
          internalAdapter: adapter,
          session: {
            user: { id: "user-1" },
            session: { token: "temporary-session" },
          },
        },
      }) as never,
    );

    expect(sessions.has("temporary-session")).toBe(false);
    expect(sessions.has("source-session")).toBe(true);
    expect(deleteSessionCookie).toHaveBeenCalledOnce();
  });
});
