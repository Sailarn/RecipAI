import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/parse-recipe", () => ({
  parseRecipeFromUrl: vi.fn(),
}));
vi.mock("@/lib/upload-token", () => ({
  mintUploadToken: vi.fn().mockResolvedValue("mock-upload-token"),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import { parseRecipeFromUrl } from "@/lib/parse-recipe";
import { POST } from "../route";

function makeRequest(body: object) {
  return new Request("http://localhost/api/parse-recipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/parse-recipe", () => {
  it("returns 400 when URL is missing", async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "URL is required" });
  });

  it("returns parsed recipe on success", async () => {
    const mockRecipe = {
      title: "Pasta",
      servings: 2,
      ingredients: [],
      instructions: [],
    };
    vi.mocked(parseRecipeFromUrl).mockResolvedValue(mockRecipe as any);

    const res = await POST(makeRequest({ url: "https://example.com/recipe" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      success: true,
      recipe: mockRecipe,
      uploadToken: "mock-upload-token",
    });
  });

  it("passes userComment to parseRecipeFromUrl", async () => {
    vi.mocked(parseRecipeFromUrl).mockResolvedValue({} as any);

    await POST(
      makeRequest({
        url: "https://example.com/recipe",
        userComment: "make it spicy",
      }),
    );

    expect(parseRecipeFromUrl).toHaveBeenCalledWith(
      "https://example.com/recipe",
      "make it spicy",
    );
  });

  it("returns 500 with a friendly message when parsing fails", async () => {
    vi.mocked(parseRecipeFromUrl).mockRejectedValue(new Error("Parse failed"));

    const res = await POST(makeRequest({ url: "https://example.com/recipe" }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to parse recipe" });
  });

  it("captures the real error in Sentry while hiding it from the client", async () => {
    const realError = new Error("Parse failed");
    vi.mocked(parseRecipeFromUrl).mockRejectedValue(realError);

    const res = await POST(makeRequest({ url: "https://example.com/recipe" }));

    const body = await res.json();
    expect(body.error).not.toContain("Parse failed");
    expect(Sentry.captureException).toHaveBeenCalledWith(
      realError,
      expect.any(Object),
    );
  });

  it("returns the friendly message for non-Error throws", async () => {
    vi.mocked(parseRecipeFromUrl).mockRejectedValue("something went wrong");

    const res = await POST(makeRequest({ url: "https://example.com/recipe" }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to parse recipe" });
  });
});
