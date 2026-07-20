import { afterEach, describe, expect, it } from "vitest";
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
});

describe("buildRecipeInlineResult", () => {
  it("builds an article card with stats and a deep-link button", () => {
    process.env.TELEGRAM_BOT_USERNAME = "recipai_auth_bot";

    const result = buildRecipeInlineResult(publicRecipe());

    expect(result.type).toBe("article");
    expect(result.title).toBe("Soup");
    expect(result.description).toBe("20 min · 4 servings · 2 ingredients");
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
  });

  it("escapes HTML in the title and omits the thumbnail when absent", () => {
    const result = buildRecipeInlineResult(
      publicRecipe({ title: "A <b> & B", imageUrl: undefined }),
    );

    const content = result.input_message_content as { message_text: string };
    expect(content.message_text).toContain("A &lt;b&gt; &amp; B");
    expect(result).not.toHaveProperty("thumbnail_url");
  });

  it("includes the thumbnail when the recipe has an image", () => {
    const result = buildRecipeInlineResult(
      publicRecipe({ imageUrl: "https://img/x.jpg" }),
    );

    expect(result.thumbnail_url).toBe("https://img/x.jpg");
  });
});
