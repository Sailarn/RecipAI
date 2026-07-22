import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractUrl,
  miniAppDeepLink,
  sendTelegramMessage,
} from "@/lib/telegram-bot";

describe("miniAppDeepLink", () => {
  const original = process.env.TELEGRAM_BOT_USERNAME;
  afterEach(() => {
    process.env.TELEGRAM_BOT_USERNAME = original;
  });

  it("builds a t.me startapp link from the bot username", () => {
    process.env.TELEGRAM_BOT_USERNAME = "recipai_auth_bot";

    expect(miniAppDeepLink("recipe_abc")).toBe(
      "https://t.me/recipai_auth_bot/recipai?startapp=recipe_abc",
    );
  });
});

describe("sendTelegramMessage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards reply_markup when provided", async () => {
    const markup = {
      inline_keyboard: [[{ text: "Open", url: "https://t.me/x" }]],
    };

    await sendTelegramMessage(123, "hi", markup);

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.reply_markup).toEqual(markup);
  });

  it("omits reply_markup when absent", async () => {
    await sendTelegramMessage(123, "hi");

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body).not.toHaveProperty("reply_markup");
  });

  it("returns true when Telegram accepts the message", async () => {
    await expect(sendTelegramMessage(123, "hi")).resolves.toBe(true);
  });

  it("returns false when Telegram rejects the message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Bad Request: chat not found"),
      }),
    );

    await expect(sendTelegramMessage(123, "hi")).resolves.toBe(false);
  });

  it("returns false when the request itself throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    await expect(sendTelegramMessage(123, "hi")).resolves.toBe(false);
  });
});

describe("extractUrl", () => {
  it("pulls the first url out of a message", () => {
    expect(extractUrl("look https://example.com/x here")).toBe(
      "https://example.com/x",
    );
    expect(extractUrl("no link")).toBeNull();
  });
});
