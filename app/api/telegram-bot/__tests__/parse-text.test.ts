import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeDirectParseJob, saveAndSendRecipe, sendTelegramMessage } =
  vi.hoisted(() => ({
    executeDirectParseJob: vi.fn(),
    saveAndSendRecipe: vi.fn(),
    sendTelegramMessage: vi.fn(),
  }));
vi.mock("@/lib/parse-recipe/direct-parse-job", () => ({
  executeDirectParseJob,
}));
vi.mock("@/lib/telegram/save-and-send-recipe", () => ({ saveAndSendRecipe }));
vi.mock("@/lib/telegram-bot", () => ({ sendTelegramMessage }));
vi.mock("@/lib/ai", () => ({ callAiForRecipe: vi.fn() }));

import { parseRecipeTextForChat } from "../parse-text";

const parsed = {
  title: "Pancakes",
  servings: null,
  ingredients: [{ item: "flour" }],
  instructions: [{ order: 1, instruction: "Fry" }],
};

beforeEach(() => {
  saveAndSendRecipe.mockResolvedValue(undefined);
  sendTelegramMessage.mockResolvedValue(true);
});

describe("parseRecipeTextForChat", () => {
  it("records a text job for the chat and sends the saved recipe", async () => {
    executeDirectParseJob.mockResolvedValue(parsed);

    await parseRecipeTextForChat({
      text: "Pancakes…",
      userId: "user-1",
      chatId: 555,
    });

    expect(executeDirectParseJob).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        source: "text",
        telegramChatId: "555",
      }),
    );
    expect(saveAndSendRecipe).toHaveBeenCalledWith({
      userId: "user-1",
      chatId: 555,
      parsed,
      sourceUrl: null,
    });
  });

  it("tells the chat why it failed instead of throwing", async () => {
    executeDirectParseJob.mockRejectedValue(
      new Error("Couldn't extract a recipe from this text"),
    );

    await parseRecipeTextForChat({
      text: "not a recipe",
      userId: "user-1",
      chatId: 555,
    });

    expect(saveAndSendRecipe).not.toHaveBeenCalled();
    expect(sendTelegramMessage).toHaveBeenCalledWith(555, expect.any(String));
  });
});
