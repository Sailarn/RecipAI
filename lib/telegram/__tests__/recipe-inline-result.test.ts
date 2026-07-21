import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicRecipe } from "@/lib/public-recipes/types";
import { buildRecipeInlineResult } from "@/lib/telegram/recipe-inline-result";

function publicRecipe(overrides: Partial<PublicRecipe> = {}): PublicRecipe {
  return {
    id: "rec-1",
    title: "Soup",
    servings: 4,
    totalTime: 20,
    ingredients: [
      { id: "a", item: "water" },
      { id: "b", item: "salt" },
    ],
    instructions: [],
    sections: [],
    owner: { name: "Chef" },
    ...overrides,
  } as PublicRecipe;
}

const originalUsername = process.env.TELEGRAM_BOT_USERNAME;
afterEach(() => {
  process.env.TELEGRAM_BOT_USERNAME = originalUsername;
  vi.unstubAllEnvs();
});

describe("buildRecipeInlineResult", () => {
  it("builds an article card with a deep-link button when there is no image", () => {
    process.env.TELEGRAM_BOT_USERNAME = "recipai_auth_bot";

    const result = buildRecipeInlineResult(publicRecipe());

    expect(result.type).toBe("article");
    expect(result.title).toBe("Soup");
    expect(result.reply_markup).toEqual({
      inline_keyboard: [
        [
          {
            text: "🍳 Open recipe",
            url: "https://t.me/recipai_auth_bot/recipai?startapp=recipe_rec-1",
          },
        ],
      ],
    });
    const content = result.input_message_content as { message_text: string };
    expect(content.message_text).toContain("Soup");
    expect(content.message_text).toContain("20 min");
    expect(content.message_text).toContain("4 servings");
  });

  it("builds a photo card with the recipe image and a rich caption", () => {
    const result = buildRecipeInlineResult(
      publicRecipe({
        imageUrl: "https://img/x.jpg",
        category: "Soup",
        description: "A warm bowl.",
      }),
    );

    expect(result.type).toBe("photo");
    expect(result.photo_url).toBe("https://img/x.jpg");
    expect(result.thumbnail_url).toBe("https://img/x.jpg");
    const caption = result.caption as string;
    expect(caption).toContain("Soup");
    expect(caption).toContain("A warm bowl.");
  });

  it("requests a JPEG transform for ImageKit images", () => {
    vi.stubEnv("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT", "https://ik.example");
    const result = buildRecipeInlineResult(
      publicRecipe({ imageUrl: "https://ik.example/recipe.jpg" }),
    );

    expect(result.photo_url).toBe(
      "https://ik.example/recipe.jpg?tr=w-800,f-jpg,q-80",
    );
  });

  it("escapes HTML in the title", () => {
    const result = buildRecipeInlineResult(
      publicRecipe({ title: "A <b> & B" }),
    );

    const content = result.input_message_content as { message_text: string };
    expect(content.message_text).toContain("A &lt;b&gt; &amp; B");
  });

  it("truncates a long description in the caption", () => {
    const result = buildRecipeInlineResult(
      publicRecipe({
        imageUrl: "https://img/x.jpg",
        description: "x".repeat(400),
      }),
    );

    const caption = result.caption as string;
    expect(caption).toContain("…");
    expect(caption.length).toBeLessThan(400);
  });
});
