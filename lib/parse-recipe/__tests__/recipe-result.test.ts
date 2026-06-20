import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedRecipe } from "@/lib/db/schema";
import { log } from "@/lib/telemetry";
import { requireCompleteRecipe } from "../recipe-result";

vi.mock("@/lib/telemetry", () => ({ log: vi.fn() }));

const completeRecipe = {
  title: "Soup",
  servings: 2,
  ingredients: [{ item: "salt", amount: 1, unit: "tsp" }],
  instructions: [{ instruction: "Boil" }],
} as unknown as ParsedRecipe;

describe("requireCompleteRecipe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the recipe and logs nothing when complete", () => {
    const result = requireCompleteRecipe(completeRecipe, "page", {
      jobId: "job-1",
      url: "https://example.com",
    });

    expect(result).toBe(completeRecipe);
    expect(log).not.toHaveBeenCalled();
  });

  it("rejects and logs an explicit notRecipe response with its source URL", () => {
    expect(() =>
      requireCompleteRecipe({ notRecipe: true }, "page", {
        jobId: "job-1",
        url: "https://example.com/post",
      }),
    ).toThrow("Couldn't extract a recipe from this page");
    expect(log).toHaveBeenCalledWith("warn", "parse_incomplete", {
      source: "page",
      reason: "not_recipe",
      jobId: "job-1",
      url: "https://example.com/post",
    });
  });

  it("logs the partial result when ingredients are missing", () => {
    const partial = { ...completeRecipe, ingredients: [] };

    expect(() =>
      requireCompleteRecipe(partial, "page", {
        jobId: "job-2",
        url: "https://example.com/recipe",
      }),
    ).toThrow();
    expect(log).toHaveBeenCalledWith("warn", "parse_incomplete", {
      source: "page",
      reason: "no_ingredients",
      jobId: "job-2",
      url: "https://example.com/recipe",
      title: "Soup",
      ingredientCount: 0,
      instructionCount: 1,
      result: partial,
    });
  });

  it("logs a null url for a photo with no instructions", () => {
    const partial = { ...completeRecipe, instructions: [] };

    expect(() =>
      requireCompleteRecipe(partial, "photo", { jobId: "job-3" }),
    ).toThrow();
    expect(log).toHaveBeenCalledWith("warn", "parse_incomplete", {
      source: "photo",
      reason: "no_instructions",
      jobId: "job-3",
      url: null,
      title: "Soup",
      ingredientCount: 1,
      instructionCount: 0,
      result: partial,
    });
  });
});
