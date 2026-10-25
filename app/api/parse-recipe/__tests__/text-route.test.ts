import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: vi.fn().mockResolvedValue(null) } },
}));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/rate-limit", () => ({
  enforceParseRateLimit: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/ai", () => ({
  callAiForRecipe: vi.fn(),
}));
vi.mock("@/lib/parse-recipe/prompts", () => ({
  buildTextPrompt: vi.fn((text: string) => `prompt:${text}`),
}));
const insertValues = vi.fn().mockResolvedValue(undefined);
const updateWhere = vi.fn().mockResolvedValue(undefined);
const updateSet = vi.fn(() => ({ where: updateWhere }));
vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: updateSet })),
  },
}));

import { callAiForRecipe } from "@/lib/ai";
import { buildTextPrompt } from "@/lib/parse-recipe/prompts";
import { MAX_RECIPE_TEXT_CHARS } from "@/lib/parse-recipe/text";
import { enforceParseRateLimit } from "@/lib/rate-limit";
import { POST } from "../text/route";

const recipeText =
  "Pasta: 200 g pasta, salt. Boil the pasta in salted water for 9 minutes.";

const mockRecipe = {
  title: "Pasta",
  servings: null,
  ingredients: [{ amount: 200, unit: "g", item: "pasta" }],
  instructions: [{ order: 1, instruction: "Boil the pasta" }],
};

function makeRequest(body: unknown): Request {
  return {
    url: "http://localhost/api/parse-recipe/text",
    method: "POST",
    json: () => Promise.resolve(body),
  } as unknown as Request;
}

beforeEach(() => {
  vi.mocked(enforceParseRateLimit).mockResolvedValue(null);
});

describe("POST /api/parse-recipe/text", () => {
  describe("request validation", () => {
    it("returns the rate-limit response and skips the model when over the limit", async () => {
      vi.mocked(enforceParseRateLimit).mockResolvedValue(
        new Response(null, { status: 429 }) as never,
      );

      const res = await POST(makeRequest({ text: recipeText }));

      expect(res.status).toBe(429);
      expect(callAiForRecipe).not.toHaveBeenCalled();
    });

    it("returns 400 on invalid JSON body", async () => {
      const req = { json: () => Promise.reject(new Error("bad")) } as Request;

      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("returns 400 when the text is missing or too short to be a recipe", async () => {
      const missing = await POST(makeRequest({}));
      const tooShort = await POST(makeRequest({ text: "   eggs   " }));

      expect(missing.status).toBe(400);
      expect(tooShort.status).toBe(400);
      expect(callAiForRecipe).not.toHaveBeenCalled();
    });
  });

  describe("parsing", () => {
    it("returns the parsed recipe and records the job", async () => {
      vi.mocked(callAiForRecipe).mockResolvedValue(mockRecipe as never);

      const res = await POST(makeRequest({ text: recipeText, jobId: "job-1" }));

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(mockRecipe);
      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "job-1",
          url: null,
          status: "processing",
        }),
      );
      expect(updateSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: "done", result: mockRecipe }),
      );
    });

    it("caps the text sent to the model", async () => {
      vi.mocked(callAiForRecipe).mockResolvedValue(mockRecipe as never);
      const longText = recipeText.repeat(1000);

      await POST(makeRequest({ text: longText }));

      expect(buildTextPrompt).toHaveBeenCalledWith(
        longText.slice(0, MAX_RECIPE_TEXT_CHARS),
      );
    });

    it("rejects text that holds no recipe", async () => {
      vi.mocked(callAiForRecipe).mockResolvedValue({
        notRecipe: true,
      } as never);

      const res = await POST(makeRequest({ text: recipeText }));

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        error: "Couldn't extract a recipe from this text",
      });
    });
  });
});
