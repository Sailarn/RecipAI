import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedRecipe } from "@/lib/db/schema";

const { mockSave, mockSendPhoto, mockSendMessage, mockCapture } = vi.hoisted(
  () => ({
    mockSave: vi.fn(),
    mockSendPhoto: vi.fn(),
    mockSendMessage: vi.fn(),
    mockCapture: vi.fn(),
  }),
);

vi.mock("@/lib/parse-recipe/save-parsed-recipe-server", () => ({
  saveParsedRecipeForUser: mockSave,
}));
vi.mock("@/lib/telegram-bot", () => ({
  sendTelegramPhoto: mockSendPhoto,
  sendTelegramMessage: mockSendMessage,
  miniAppDeepLink: (startParam: string) =>
    `https://t.me/bot?startapp=${startParam}`,
}));
vi.mock("@/lib/upload/images", () => ({
  isImageKitUrl: (url: string) => url.startsWith("https://ik.test/"),
}));
vi.mock("@/lib/api-errors", () => ({ ApiError: { capture: mockCapture } }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn() } }));

import { saveAndSendRecipe } from "../save-and-send-recipe";

function parsedRecipe(imageUrl?: string): ParsedRecipe {
  return {
    title: "Borscht",
    prepTime: 10,
    cookTime: 50,
    ingredients: [{ item: "beet" }],
    instructions: [{ text: "Cook" }],
    imageUrl,
  } as unknown as ParsedRecipe;
}

function send(imageUrl?: string) {
  return saveAndSendRecipe({
    userId: "user-1",
    chatId: 42,
    parsed: parsedRecipe(imageUrl),
    sourceUrl: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSave.mockResolvedValue("recipe-1");
  mockSendPhoto.mockResolvedValue(undefined);
  mockSendMessage.mockResolvedValue(undefined);
});

describe("saveAndSendRecipe", () => {
  describe("saving", () => {
    it("saves the parse for the user with its source url", async () => {
      await send();

      expect(mockSave).toHaveBeenCalledWith({
        userId: "user-1",
        parsed: parsedRecipe(),
        sourceUrl: null,
      });
    });

    it("throws and sends nothing when the save fails", async () => {
      mockSave.mockRejectedValue(new Error("db down"));

      await expect(send()).rejects.toThrow("db down");
      expect(mockSendMessage).not.toHaveBeenCalled();
      expect(mockSendPhoto).not.toHaveBeenCalled();
    });
  });

  describe("recipe card", () => {
    it("sends a photo card for an ImageKit image", async () => {
      await send("https://ik.test/recipes/a.jpg");

      expect(mockSendPhoto).toHaveBeenCalledOnce();
      expect(mockSendPhoto.mock.calls[0][0]).toBe(42);
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it("sends text straight away for a non-ImageKit image", async () => {
      await send("https://cdn.tiktok.test/expiring.jpg");

      expect(mockSendPhoto).not.toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalledOnce();
    });

    it("falls back to text when Telegram rejects the photo", async () => {
      mockSendPhoto.mockRejectedValue(new Error("400 wrong file"));

      await send("https://ik.test/recipes/a.jpg");

      expect(mockSendMessage).toHaveBeenCalledOnce();
      expect(mockCapture).not.toHaveBeenCalled();
    });

    it("reports but does not throw when no message can be delivered", async () => {
      mockSendMessage.mockRejectedValue(new Error("bot blocked"));

      await expect(send()).resolves.toBeUndefined();
      expect(mockCapture).toHaveBeenCalledOnce();
    });
  });
});
