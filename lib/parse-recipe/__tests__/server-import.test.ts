import { beforeEach, describe, expect, it, vi } from "vitest";

const insertValues = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const selectLimit = vi.hoisted(() => vi.fn());
const findRecipeIdBySource = vi.hoisted(() => vi.fn());
const findCachedParseResult = vi.hoisted(() => vi.fn());
const saveParsedRecipeForUser = vi.hoisted(() => vi.fn());
const rateLimit = vi.hoisted(() => vi.fn());
const after = vi.hoisted(() => vi.fn());
const failStaleParseJobs = vi.hoisted(() => vi.fn());

vi.mock("next/server", () => ({ after }));
vi.mock("@/db", () => ({
  db: {
    insert: () => ({ values: insertValues }),
    select: () => ({
      from: () => ({ where: () => ({ limit: selectLimit }) }),
    }),
  },
}));
vi.mock("@/db/schema/parse-jobs", () => ({ parseJobs: {} }));
vi.mock("../find-recipe-by-source", () => ({ findRecipeIdBySource }));
vi.mock("../parse-cache", () => ({ findCachedParseResult }));
vi.mock("../save-parsed-recipe-server", () => ({ saveParsedRecipeForUser }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit }));
vi.mock("@/lib/telemetry", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/api-errors", () => ({ ApiError: { capture: vi.fn() } }));
vi.mock("../stale-parse-jobs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../stale-parse-jobs")>()),
  failStaleParseJobs,
}));

import { getImportStatus, importRecipeForUser } from "../server-import";

const URL_ = "https://example.com/borscht";

describe("importRecipeForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findRecipeIdBySource.mockResolvedValue(null);
    findCachedParseResult.mockResolvedValue(null);
    rateLimit.mockResolvedValue({ allowed: true, resetSeconds: 3600 });
  });

  it("returns the existing recipe for a link already in the library", async () => {
    findRecipeIdBySource.mockResolvedValue("r1");
    await expect(importRecipeForUser("u1", URL_)).resolves.toEqual({
      status: "already_saved",
      recipeId: "r1",
    });
    expect(insertValues).not.toHaveBeenCalled();
    expect(rateLimit).not.toHaveBeenCalled();
  });

  it("shares the user's parse budget with in-app imports", async () => {
    rateLimit.mockResolvedValue({ allowed: false, resetSeconds: 900 });
    await expect(importRecipeForUser("u1", URL_)).resolves.toEqual({
      status: "rate_limited",
      retryAfterSeconds: 900,
    });
    expect(rateLimit).toHaveBeenCalledWith("parse:user:u1", 60, 3600);
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("saves a cached parse result straight away", async () => {
    const cached = { title: "Borscht", ingredients: [{}], instructions: [{}] };
    findCachedParseResult.mockResolvedValue(cached);
    saveParsedRecipeForUser.mockResolvedValue({
      recipeId: "new",
      alreadySaved: false,
    });

    const outcome = await importRecipeForUser("u1", URL_);

    expect(outcome).toMatchObject({ status: "saved", recipeId: "new" });
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        url: URL_,
        status: "done",
        result: cached,
      }),
    );
    expect(saveParsedRecipeForUser).toHaveBeenCalledWith({
      userId: "u1",
      parsed: cached,
      sourceUrl: URL_,
    });
    expect(after).not.toHaveBeenCalled();
  });

  it("queues a parse job and kicks off processing otherwise", async () => {
    const outcome = await importRecipeForUser("u1", URL_);

    expect(outcome).toMatchObject({ status: "pending" });
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", status: "pending" }),
    );
    expect(after).toHaveBeenCalledTimes(1);
  });

  it("fails open when the rate limiter is unavailable", async () => {
    rateLimit.mockRejectedValue(new Error("redis down"));
    await expect(importRecipeForUser("u1", URL_)).resolves.toMatchObject({
      status: "pending",
    });
  });
});

describe("getImportStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  const fresh = { updatedAt: new Date(), url: URL_ };

  it("is null for a job that isn't the user's", async () => {
    selectLimit.mockResolvedValue([]);
    await expect(getImportStatus("u1", "j1")).resolves.toBeNull();
  });

  it("returns the saved recipe id when done", async () => {
    selectLimit.mockResolvedValue([{ ...fresh, status: "done" }]);
    findRecipeIdBySource.mockResolvedValue("r9");
    await expect(getImportStatus("u1", "j1")).resolves.toEqual({
      status: "done",
      url: URL_,
      recipeId: "r9",
    });
  });

  it("reports failures with their error", async () => {
    selectLimit.mockResolvedValue([
      { ...fresh, status: "failed", error: "No recipe found" },
    ]);
    await expect(getImportStatus("u1", "j1")).resolves.toEqual({
      status: "failed",
      url: URL_,
      error: "No recipe found",
    });
  });

  it("times out a job stuck in processing", async () => {
    selectLimit.mockResolvedValue([
      {
        status: "processing",
        url: URL_,
        updatedAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    ]);
    const status = await getImportStatus("u1", "j1");
    expect(status?.status).toBe("failed");
    expect(failStaleParseJobs).toHaveBeenCalled();
  });

  it("imports and dedupes the link without tracking parameters", async () => {
    findRecipeIdBySource.mockResolvedValue(null);
    findCachedParseResult.mockResolvedValue(null);
    rateLimit.mockResolvedValue({ allowed: true, resetSeconds: 3600 });

    await importRecipeForUser("u1", `${URL_}?utm_source=chatgpt.com`);

    expect(findRecipeIdBySource).toHaveBeenCalledWith("u1", URL_);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ url: URL_ }),
    );
  });
});
