import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  },
}));

import { callGeminiForRecipe } from "../gemini";

const mockRecipe = {
  title: "Pasta",
  servings: 2,
  ingredients: ["pasta", "sauce"],
  instructions: [{ step: "Boil water" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GEMINI_API_KEY = "test-key";
});

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
});

describe("callGeminiForRecipe", () => {
  it("throws when GEMINI_API_KEY is not set", async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(callGeminiForRecipe("parse this recipe")).rejects.toThrow(
      "Gemini API key not configured",
    );
  });

  it("returns parsed recipe on success", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(mockRecipe) },
    });

    const result = await callGeminiForRecipe("parse this recipe");

    expect(result).toEqual(mockRecipe);
  });

  it("passes the prompt to generateContent", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(mockRecipe) },
    });

    await callGeminiForRecipe("my prompt text");

    expect(mockGenerateContent).toHaveBeenCalledWith("my prompt text");
  });

  it("throws when Gemini returns invalid JSON", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "not valid json {{" },
    });

    await expect(callGeminiForRecipe("parse this")).rejects.toThrow(
      "Gemini returned invalid JSON",
    );
  });
});
