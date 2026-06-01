import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectWhere, insertValues } = vi.hoisted(() => ({
  selectWhere: vi.fn(),
  insertValues: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({ where: selectWhere }),
    }),
    insert: vi.fn().mockReturnValue({ values: insertValues }),
  },
}));
vi.mock("@/db/schema/auth", () => ({ account: {} }));
vi.mock("@/db/schema/parse-jobs", () => ({ parseJobs: {} }));
vi.mock("@/lib/telegram-bot", () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue(undefined),
  extractUrl: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { extractUrl, sendTelegramMessage } from "@/lib/telegram-bot";
import { POST } from "../route";

/** Build an account row whose idToken JWT payload carries the given Telegram id. */
function accountWithTelegramId(
  telegramId: string,
  userId = "user-1",
): { idToken: string; userId: string } {
  const payload = Buffer.from(JSON.stringify({ sub: telegramId })).toString(
    "base64url",
  );
  return { idToken: `header.${payload}.sig`, userId };
}

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {},
): NextRequest {
  return {
    json: () => Promise.resolve(body),
    headers: { get: (key: string) => headers[key.toLowerCase()] ?? null },
  } as unknown as NextRequest;
}

function telegramMessage(overrides: Record<string, unknown> = {}) {
  return {
    message: {
      chat: { id: 555 },
      from: { id: 42, first_name: "Alex" },
      text: "",
      ...overrides,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  selectWhere.mockResolvedValue([]);
  vi.mocked(extractUrl).mockReturnValue(null);
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
});

describe("POST /api/telegram-bot", () => {
  describe("webhook authentication", () => {
    it("returns 401 when the secret header does not match", async () => {
      process.env.TELEGRAM_WEBHOOK_SECRET = "expected-secret";

      const res = await POST(
        makeRequest(telegramMessage(), {
          "x-telegram-bot-api-secret-token": "wrong",
        }),
      );

      expect(res.status).toBe(401);
    });

    it("accepts the request when the secret header matches", async () => {
      process.env.TELEGRAM_WEBHOOK_SECRET = "expected-secret";

      const res = await POST(
        makeRequest(telegramMessage(), {
          "x-telegram-bot-api-secret-token": "expected-secret",
        }),
      );

      expect(res.status).toBe(200);
    });

    it("stays open when no secret is configured", async () => {
      const res = await POST(makeRequest(telegramMessage()));

      expect(res.status).toBe(200);
    });
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = {
      json: () => Promise.reject(new Error("bad JSON")),
      headers: { get: () => null },
    } as unknown as NextRequest;

    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("acknowledges updates without a message", async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(200);
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("prompts to link account when sender is not recognised", async () => {
    selectWhere.mockResolvedValue([]);

    await POST(makeRequest(telegramMessage({ text: "hello" })));

    expect(sendTelegramMessage).toHaveBeenCalledWith(
      555,
      expect.stringContaining("Link your Telegram account"),
    );
  });

  it("greets by first name on /start, not the user id", async () => {
    selectWhere.mockResolvedValue([accountWithTelegramId("42")]);

    await POST(makeRequest(telegramMessage({ text: "/start" })));

    const [, greeting] = vi.mocked(sendTelegramMessage).mock.calls[0];
    expect(greeting).toContain("Alex");
    expect(greeting).not.toContain("user-1");
  });

  it("falls back to a default greeting when first_name is absent", async () => {
    selectWhere.mockResolvedValue([accountWithTelegramId("42")]);

    await POST(
      makeRequest(telegramMessage({ text: "/start", from: { id: 42 } })),
    );

    const [, greeting] = vi.mocked(sendTelegramMessage).mock.calls[0];
    expect(greeting).toContain("there");
  });

  it("asks for a link when the message has no URL", async () => {
    selectWhere.mockResolvedValue([accountWithTelegramId("42")]);
    vi.mocked(extractUrl).mockReturnValue(null);

    await POST(makeRequest(telegramMessage({ text: "no link here" })));

    expect(sendTelegramMessage).toHaveBeenCalledWith(
      555,
      expect.stringContaining("Send me a recipe URL"),
    );
  });

  it("enqueues a parse job and confirms when a URL is sent", async () => {
    selectWhere.mockResolvedValue([accountWithTelegramId("42", "user-9")]);
    vi.mocked(extractUrl).mockReturnValue("https://insta.com/reel/abc");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    const res = await POST(
      makeRequest(telegramMessage({ text: "https://insta.com/reel/abc" })),
    );

    expect(res.status).toBe(200);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-9",
        url: "https://insta.com/reel/abc",
        telegramChatId: "555",
      }),
    );
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      555,
      expect.stringContaining("Parsing recipe"),
    );

    vi.unstubAllGlobals();
  });
});
