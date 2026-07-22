import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: { select: vi.fn() },
}));
vi.mock("@/db/schema/auth", () => ({ account: {}, user: {} }));
vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  eq: vi.fn(),
  inArray: vi.fn(),
  relations: vi.fn(),
}));

import { db } from "@/db";
import { resolveTelegramChatId, telegramIdFromAccount } from "../account";

type TelegramAccount = Parameters<typeof telegramIdFromAccount>[0];

function makeAccount(overrides: Partial<TelegramAccount>): TelegramAccount {
  return {
    id: "acc-1",
    accountId: "111",
    providerId: "telegram",
    userId: "user-1",
    idToken: null,
    telegramId: null,
    ...overrides,
  } as TelegramAccount;
}

// A JWT with the given payload — only the middle segment is read.
function makeIdToken(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${body}.signature`;
}

describe("telegramIdFromAccount", () => {
  it("prefers the mirrored telegramId column", () => {
    expect(telegramIdFromAccount(makeAccount({ telegramId: "999" }))).toBe(
      "999",
    );
  });

  it("uses accountId for a Mini App (providerId 'telegram') account", () => {
    expect(
      telegramIdFromAccount(
        makeAccount({ providerId: "telegram", accountId: "222" }),
      ),
    ).toBe("222");
  });

  it("reads the sub claim from an OIDC account's id token", () => {
    const account = makeAccount({
      providerId: "telegram-oidc",
      idToken: makeIdToken({ sub: 333 }),
    });
    expect(telegramIdFromAccount(account)).toBe("333");
  });

  it("falls back to the id claim when sub is absent", () => {
    const account = makeAccount({
      providerId: "telegram-oidc",
      idToken: makeIdToken({ id: 444 }),
    });
    expect(telegramIdFromAccount(account)).toBe("444");
  });

  it("returns null for an OIDC account with no id token", () => {
    expect(
      telegramIdFromAccount(
        makeAccount({ providerId: "telegram-oidc", idToken: null }),
      ),
    ).toBeNull();
  });

  it("returns null when the id token is malformed", () => {
    expect(
      telegramIdFromAccount(
        makeAccount({ providerId: "telegram-oidc", idToken: "not-a-jwt" }),
      ),
    ).toBeNull();
  });
});

function mockSelectChains(userRows: unknown[], accountRows: unknown[]): void {
  const userChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(userRows),
  };
  const accountChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(accountRows),
  };
  vi.mocked(db.select)
    .mockReturnValueOnce(userChain as never)
    .mockReturnValueOnce(accountChain as never);
}

describe("resolveTelegramChatId", () => {
  beforeEach(() => {
    // mockReset (not clearAllMocks) drains the mockReturnValueOnce queue, so a
    // test that returns early without consuming its second chain can't leak it
    // into the next test.
    vi.mocked(db.select).mockReset();
  });

  it("returns the user's mirrored telegramId when present", async () => {
    mockSelectChains([{ telegramId: "555" }], []);

    await expect(resolveTelegramChatId("user-1")).resolves.toBe("555");
  });

  it("falls back to a linked account when the user row has no telegramId", async () => {
    mockSelectChains(
      [{ telegramId: null }],
      [makeAccount({ providerId: "telegram", accountId: "666" })],
    );

    await expect(resolveTelegramChatId("user-1")).resolves.toBe("666");
  });

  it("returns null when the user has no Telegram connection at all", async () => {
    mockSelectChains([{ telegramId: null }], []);

    await expect(resolveTelegramChatId("user-1")).resolves.toBeNull();
  });
});
