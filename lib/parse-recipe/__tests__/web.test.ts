import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai", () => ({
  callAiForRecipe: vi.fn(),
}));

vi.mock("@/lib/scrapers/phantomjs", () => ({
  fetchHtmlWithPhantomJs: vi.fn(),
}));

vi.mock("@/lib/scrapers/scrape-do", () => ({
  fetchHtmlWithScrapeDo: vi.fn(),
}));

import { callAiForRecipe } from "@/lib/ai";
import type { ParsedRecipe } from "@/lib/db/schema";
import { fetchHtmlWithPhantomJs } from "@/lib/scrapers/phantomjs";
import { parseWebRecipe } from "../web";

// Body text must exceed 100 chars — parseWebRecipe throws "Could not extract
// enough text from page" (web.ts:153) below that floor, which would fail this
// test BEFORE the AI call is ever reached.
const html =
  "<html><body><h1>Tomato Toast</h1><p>Toast two thick slices of sourdough bread until golden and crisp. Rub the warm toast with a halved garlic clove, then top generously with sliced ripe tomatoes, a drizzle of extra virgin olive oil, and a good pinch of flaky sea salt before serving right away.</p></body></html>";

const parsedRecipe: ParsedRecipe = {
  title: "Tomato Toast",
  servings: 2,
  ingredients: [{ item: "tomatoes" }],
  instructions: [{ order: 1, instruction: "Toast bread." }],
  sourceUrl: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchHtmlWithPhantomJs).mockResolvedValue(html);
  vi.mocked(callAiForRecipe).mockResolvedValue(parsedRecipe);
});

describe("parseWebRecipe", () => {
  it("uses callAiForRecipe by default when no aiCaller is passed", async () => {
    await parseWebRecipe("https://example.com/recipe");

    expect(callAiForRecipe).toHaveBeenCalledWith(
      expect.stringContaining("Tomato Toast"),
    );
  });

  it("uses the injected aiCaller instead of callAiForRecipe when one is passed", async () => {
    const customCaller = vi.fn().mockResolvedValue(parsedRecipe);

    await parseWebRecipe("https://example.com/recipe", customCaller);

    expect(customCaller).toHaveBeenCalledWith(
      expect.stringContaining("Tomato Toast"),
    );
    expect(callAiForRecipe).not.toHaveBeenCalled();
  });
});
