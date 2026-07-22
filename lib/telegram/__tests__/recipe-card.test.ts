import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type RecipeCardData,
  recipeCardButton,
  recipeCardCaption,
  recipeCardStats,
  telegramPhotoUrl,
} from "../recipe-card";

function cardData(overrides: Partial<RecipeCardData> = {}): RecipeCardData {
  return {
    id: "rec-1",
    title: "Soup",
    category: null,
    totalTime: 20,
    servings: 4,
    ingredientCount: 2,
    imageUrl: null,
    ...overrides,
  };
}

const originalUsername = process.env.TELEGRAM_BOT_USERNAME;
afterEach(() => {
  process.env.TELEGRAM_BOT_USERNAME = originalUsername;
  vi.unstubAllEnvs();
});

describe("recipeCardStats", () => {
  it("joins time, servings, and ingredient count", () => {
    expect(recipeCardStats(cardData())).toBe(
      "⏱ 20 min  ·  🍽 4 servings  ·  🧂 2 ingredients",
    );
  });

  it("drops the time when absent and singularizes counts", () => {
    const stats = recipeCardStats(
      cardData({ totalTime: null, servings: 1, ingredientCount: 1 }),
    );

    expect(stats).toBe("🍽 1 serving  ·  🧂 1 ingredient");
  });
});

describe("recipeCardCaption", () => {
  it("puts title and meta on separate lines with no header by default", () => {
    const caption = recipeCardCaption(cardData({ category: "Dinner" }));

    expect(caption).toBe(
      "🍳 <b>Soup</b>\nDinner  ·  ⏱ 20 min  ·  🍽 4 servings  ·  🧂 2 ingredients",
    );
  });

  it("prepends the header line when provided", () => {
    const caption = recipeCardCaption(cardData(), "✅ Saved to RecipAI");

    expect(caption.startsWith("✅ Saved to RecipAI\n🍳 <b>Soup</b>")).toBe(
      true,
    );
  });

  it("escapes HTML in the title and category", () => {
    const caption = recipeCardCaption(
      cardData({ title: "A <b> & B", category: "<i>x" }),
    );

    expect(caption).toContain("A &lt;b&gt; &amp; B");
    expect(caption).toContain("&lt;i&gt;x");
  });
});

describe("recipeCardButton", () => {
  it("builds an Open recipe button deep-linking to the mini app", () => {
    process.env.TELEGRAM_BOT_USERNAME = "recipai_auth_bot";

    expect(recipeCardButton("abc")).toEqual({
      inline_keyboard: [
        [
          {
            text: "🍳 Open recipe",
            url: "https://t.me/recipai_auth_bot/recipai?startapp=recipe_abc",
          },
        ],
      ],
    });
  });
});

describe("telegramPhotoUrl", () => {
  it("requests a JPEG transform for ImageKit images", () => {
    vi.stubEnv("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT", "https://ik.example");

    expect(telegramPhotoUrl("https://ik.example/x.jpg")).toBe(
      "https://ik.example/x.jpg?tr=w-800,f-jpg,q-80",
    );
  });

  it("passes non-ImageKit sources through unchanged", () => {
    vi.stubEnv("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT", "https://ik.example");

    expect(telegramPhotoUrl("https://cdn.other/x.jpg")).toBe(
      "https://cdn.other/x.jpg",
    );
  });
});
