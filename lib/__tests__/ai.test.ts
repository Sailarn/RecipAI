import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  },
}));

import { log, trackEvent } from "@/lib/telemetry";
import { callAiForRecipe } from "../ai";

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

describe("callAiForRecipe", () => {
  it("throws when GEMINI_API_KEY is not set", async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(callAiForRecipe("parse this recipe")).rejects.toThrow(
      "Gemini API key not configured",
    );
  });

  it("returns parsed recipe on success", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(mockRecipe) },
    });

    const result = await callAiForRecipe("parse this recipe");

    expect(result).toEqual(mockRecipe);
  });

  it("passes the prompt to generateContent", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(mockRecipe) },
    });

    await callAiForRecipe("my prompt text");

    expect(mockGenerateContent).toHaveBeenCalledWith("my prompt text");
  });

  it("throws when Gemini returns invalid JSON", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "not valid json {{" },
    });

    await expect(callAiForRecipe("parse this")).rejects.toThrow(
      "Gemini returned invalid JSON",
    );
  });
});

describe("OpenAI fallback", () => {
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    vi.unstubAllGlobals();
  });

  it("falls back to OpenAI after every Gemini model fails", async () => {
    mockGenerateContent.mockRejectedValue(new Error("429 Too Many Requests"));
    process.env.OPENAI_API_KEY = "openai-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockRecipe) } }],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callAiForRecipe("parse this recipe");

    expect(result).toEqual(mockRecipe);
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not call OpenAI when no key is set", async () => {
    mockGenerateContent.mockRejectedValue(new Error("429 Too Many Requests"));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiForRecipe("parse this")).rejects.toThrow("429");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("AI call logging", () => {
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    vi.unstubAllGlobals();
  });

  it("logs info ai_call on Gemini success", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(mockRecipe) },
    });

    await callAiForRecipe("parse this recipe");

    expect(log).toHaveBeenCalledWith(
      "info",
      "ai_call",
      expect.objectContaining({
        model: "gemini-2.5-flash",
        success: true,
        context: "recipe",
      }),
    );
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("logs warn ai_call on Gemini failure then info on success", async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error("model overloaded"))
      .mockResolvedValue({
        response: { text: () => JSON.stringify(mockRecipe) },
      });

    await callAiForRecipe("parse this");

    expect(log).toHaveBeenCalledWith(
      "warn",
      "ai_call",
      expect.objectContaining({ model: "gemini-2.5-flash", success: false }),
    );
    expect(log).toHaveBeenCalledWith(
      "info",
      "ai_call",
      expect.objectContaining({ model: "gemini-2.0-flash", success: true }),
    );
  });

  it("fires ai_fallback_to_openai event when falling back", async () => {
    mockGenerateContent.mockRejectedValue(new Error("all gemini down"));
    process.env.OPENAI_API_KEY = "openai-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockRecipe) } }],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await callAiForRecipe("parse this");

    expect(trackEvent).toHaveBeenCalledWith("ai_fallback_to_openai", {
      context: "recipe",
    });
  });
});
