import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/public-recipes/server", () => ({
  getPublicRecipe: vi.fn(),
}));

import { getPublicRecipe } from "@/lib/public-recipes/server";
import { GET } from "../route";

const params = { params: Promise.resolve({ id: "recipe-1" }) };

const publicRecipe = {
  id: "recipe-1",
  title: "Soup",
  servings: 2,
  ingredients: [{ id: "ing-1", item: "Water" }],
  instructions: [{ id: "step-1", order: 1, instruction: "Boil" }],
  owner: { name: "Olena" },
};

describe("GET /api/recipes/[id]/public", () => {
  it("requires no authentication and returns the public recipe", async () => {
    vi.mocked(getPublicRecipe).mockResolvedValue(publicRecipe as never);

    const response = await GET(new Request("http://localhost"), params);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ recipe: publicRecipe });
    expect(getPublicRecipe).toHaveBeenCalledWith("recipe-1");
  });

  it("returns 404 when the recipe is private or doesn't exist", async () => {
    vi.mocked(getPublicRecipe).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), params);

    expect(response.status).toBe(404);
  });
});
