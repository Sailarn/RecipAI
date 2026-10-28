import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedRecipe } from "@/lib/db/schema";

const { saveParsedResult, recordParseHistory, announceSavedParse } = vi.hoisted(
  () => ({
    saveParsedResult: vi.fn(),
    recordParseHistory: vi.fn(),
    announceSavedParse: vi.fn(),
  }),
);
vi.mock("@/lib/db/save-parsed-recipe", () => ({ saveParsedResult }));
vi.mock("@/lib/db/parse-history", () => ({ recordParseHistory }));
vi.mock("@/lib/parse-recipe/announce-parse", () => ({ announceSavedParse }));
vi.mock("@/lib/telemetry", () => ({
  trackEvent: vi.fn(),
  captureError: vi.fn(),
}));

import { captureError, trackEvent } from "@/lib/telemetry";
import { completeLinkParse } from "../complete-link-parse";

const recipe = {
  title: "Soup",
  sourceUrl: "https://example.com/soup",
} as ParsedRecipe;
const labels = { added: "added", alreadySaved: "already" };

beforeEach(() => {
  vi.clearAllMocks();
  recordParseHistory.mockResolvedValue(undefined);
  saveParsedResult.mockResolvedValue({
    recipeId: "local-1",
    alreadySaved: true,
  });
});

describe("completeLinkParse", () => {
  it("saves an anonymous import on the device", async () => {
    const triggerSync = vi.fn();

    const completed = await completeLinkParse({
      jobId: "job-1",
      recipe,
      jobUrl: "https://example.com/soup",
      uploadToken: "token-1",
      triggerSync,
      labels,
    });

    expect(saveParsedResult).toHaveBeenCalledWith(recipe, "token-1");
    expect(triggerSync).not.toHaveBeenCalled();
    expect(completed).toEqual({ recipeId: "local-1", alreadySaved: true });
  });

  it("pulls a server-saved import instead of saving it again", async () => {
    const triggerSync = vi.fn().mockResolvedValue(undefined);

    const completed = await completeLinkParse({
      jobId: "job-1",
      recipe,
      jobUrl: "https://example.com/soup",
      savedRecipeId: "server-1",
      triggerSync,
      labels,
    });

    expect(saveParsedResult).not.toHaveBeenCalled();
    expect(triggerSync).toHaveBeenCalledOnce();
    expect(trackEvent).toHaveBeenCalledWith("recipe_saved", { source: "auto" });
    expect(completed).toEqual({ recipeId: "server-1", alreadySaved: false });
  });

  it("reports a failed sync without failing the completion", async () => {
    const syncError = new Error("offline");

    await completeLinkParse({
      jobId: "job-1",
      recipe,
      jobUrl: "https://example.com/soup",
      savedRecipeId: "server-1",
      triggerSync: vi.fn().mockRejectedValue(syncError),
      labels,
    });
    await Promise.resolve();

    expect(captureError).toHaveBeenCalledWith(syncError, expect.anything());
  });

  it("records history and announces the saved recipe", async () => {
    await completeLinkParse({
      jobId: "job-1",
      recipe,
      jobUrl: "https://fallback.example.com",
      triggerSync: vi.fn(),
      labels,
    });

    expect(recordParseHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "job-1",
        status: "done",
        url: "https://example.com/soup",
      }),
    );
    expect(announceSavedParse).toHaveBeenCalledWith({
      jobId: "job-1",
      recipe,
      recipeId: "local-1",
      alreadySaved: true,
      labels,
    });
    expect(trackEvent).toHaveBeenCalledWith("parse_succeeded", {
      source: "url",
    });
  });

  it("says when the server found the link already saved", async () => {
    const completed = await completeLinkParse({
      jobId: "job-1",
      recipe,
      jobUrl: "https://example.com/soup",
      savedRecipeId: "server-1",
      alreadySaved: true,
      triggerSync: vi.fn().mockResolvedValue(undefined),
      labels,
    });

    expect(completed).toEqual({ recipeId: "server-1", alreadySaved: true });
  });
});
