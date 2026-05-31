import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session-state", () => ({
  isSignedIn: vi.fn().mockReturnValue(true),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import type { Recipe } from "../schema";
import { syncCreate, syncDelete, syncUpdate } from "../supabase-sync";

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockClear();
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockResolvedValue(new Response());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const mockRecipe: Recipe = {
  id: "recipe-1",
  title: "Test Recipe",
  servings: 4,
  ingredients: [],
  instructions: [],
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("syncCreate", () => {
  it("sends POST to /api/recipes with recipe as JSON body", () => {
    syncCreate(mockRecipe);

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mockRecipe),
    });
  });

  it("does not throw when fetch rejects", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    expect(() => syncCreate(mockRecipe)).not.toThrow();
    // allow the rejected promise to settle without unhandled rejection
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
  });
});

describe("syncUpdate", () => {
  it("sends PATCH to /api/recipes/:id with updates as JSON body", () => {
    const updates = { title: "Updated Title", servings: 6 };
    syncUpdate("recipe-1", updates);

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith("/api/recipes/recipe-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  });

  it("uses the correct recipe id in the URL", () => {
    syncUpdate("abc-123", { title: "New" });

    const url = mockFetch.mock.calls[0][0];
    expect(url).toBe("/api/recipes/abc-123");
  });

  it("does not throw when fetch rejects", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    expect(() => syncUpdate("recipe-1", { title: "X" })).not.toThrow();
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
  });
});

describe("syncDelete", () => {
  it("sends DELETE to /api/recipes/:id", () => {
    syncDelete("recipe-1");

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith("/api/recipes/recipe-1", {
      method: "DELETE",
    });
  });

  it("uses the correct recipe id in the URL", () => {
    syncDelete("xyz-456");

    const url = mockFetch.mock.calls[0][0];
    expect(url).toBe("/api/recipes/xyz-456");
  });

  it("does not throw when fetch rejects", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    expect(() => syncDelete("recipe-1")).not.toThrow();
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
  });
});
