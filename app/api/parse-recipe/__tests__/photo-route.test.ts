import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/gemini", () => ({
  callGeminiForRecipePhoto: vi.fn(),
}));
vi.mock("@/lib/parse-recipe/prompts", () => ({
  buildPhotoPrompt: vi.fn().mockReturnValue("prompt"),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import * as Sentry from "@sentry/nextjs";
import { callGeminiForRecipePhoto } from "@/lib/gemini";
import { POST } from "../photo/route";

const mockRecipe = {
  title: "Pasta",
  servings: 2,
  ingredients: [],
  instructions: [],
};

function makeRequest(body: unknown): Request {
  return {
    url: "http://localhost/api/parse-recipe/photo",
    method: "POST",
    json: () => Promise.resolve(body),
  } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/parse-recipe/photo", () => {
  it("returns 400 on invalid JSON body", async () => {
    const req = { json: () => Promise.reject(new Error("bad")) } as Request;

    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid request body" });
  });

  it("returns 400 when imageBase64 is missing", async () => {
    const res = await POST(makeRequest({ mimeType: "image/jpeg" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "imageBase64 and mimeType are required" });
  });

  it("returns 400 when mimeType is missing", async () => {
    const res = await POST(makeRequest({ imageBase64: "abc" }));

    expect(res.status).toBe(400);
  });

  it("returns the parsed recipe on success", async () => {
    vi.mocked(callGeminiForRecipePhoto).mockResolvedValue(mockRecipe as never);

    const res = await POST(
      makeRequest({ imageBase64: "abc", mimeType: "image/jpeg" }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(mockRecipe);
  });

  it("preserves the raw error message and captures it in Sentry on failure", async () => {
    const realError = new Error("503 Service Unavailable");
    vi.mocked(callGeminiForRecipePhoto).mockRejectedValue(realError);

    const res = await POST(
      makeRequest({ imageBase64: "abc", mimeType: "image/jpeg" }),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "503 Service Unavailable" });
    expect(Sentry.captureException).toHaveBeenCalledWith(
      realError,
      expect.any(Object),
    );
  });
});
