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
});

describe("extractUrl", () => {
  it("pulls the first url out of a message", () => {
    expect(extractUrl("look https://example.com/x here")).toBe(
      "https://example.com/x",
    );
    expect(extractUrl("no link")).toBeNull();
  });
});
