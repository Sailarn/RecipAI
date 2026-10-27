import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedRecipe } from "@/lib/db/schema";

const { mockInsertValues, mockUpdateSet, mockCapture, mockInternal } =
  vi.hoisted(() => ({
    mockInsertValues: vi.fn(),
    mockUpdateSet: vi.fn(),
    mockCapture: vi.fn(),
    mockInternal: vi.fn(),
  }));

vi.mock("@/db", () => ({
  db: {
    insert: () => ({ values: mockInsertValues }),
    update: () => ({ set: mockUpdateSet }),
  },
}));

vi.mock("@/lib/api-errors", () => ({
  ApiError: { capture: mockCapture, internal: mockInternal },
}));

vi.mock("@/lib/telemetry", () => ({ log: vi.fn() }));

import { executeDirectParseJob, runDirectParseJob } from "../direct-parse-job";

const RECIPE = {
  title: "Pancakes",
  ingredients: [{ item: "flour" }],
  instructions: [{ text: "Mix" }],
} as unknown as ParsedRecipe;

// update().set(...).where(...) — `where` resolves, rejects, or both in turn.
function updateWhere(...outcomes: Array<"ok" | "fail">) {
  for (const outcome of outcomes) {
    mockUpdateSet.mockImplementationOnce((changes: unknown) => ({
      changes,
      where: () =>
        outcome === "ok"
          ? Promise.resolve()
          : Promise.reject(new Error("db down")),
    }));
  }
}

function job(extract: () => Promise<unknown>) {
  return {
    jobId: "job-1",
    userId: "user-1",
    source: "text" as const,
    extract: extract as () => Promise<ParsedRecipe>,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockInsertValues.mockResolvedValue(undefined);
});

describe("executeDirectParseJob", () => {
  describe("successful parse", () => {
    it("records the job done and returns the recipe", async () => {
      updateWhere("ok");

      const recipe = await executeDirectParseJob(
        job(() => Promise.resolve(RECIPE)),
      );

      expect(recipe).toBe(RECIPE);
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({ id: "job-1", status: "processing" }),
      );
      expect(mockUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: "done", result: RECIPE }),
      );
    });

    it("still returns the recipe when recording it in history fails", async () => {
      updateWhere("fail");

      const recipe = await executeDirectParseJob(
        job(() => Promise.resolve(RECIPE)),
      );

      expect(recipe).toBe(RECIPE);
      expect(mockCapture).toHaveBeenCalledOnce();
    });
  });

  describe("failed parse", () => {
    it("marks the job failed and rethrows the parse error", async () => {
      updateWhere("ok");
      const parseError = new Error("Gemini 503");

      await expect(
        executeDirectParseJob(job(() => Promise.reject(parseError))),
      ).rejects.toBe(parseError);

      expect(mockUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed", error: "Gemini 503" }),
      );
    });

    it("rejects a non-recipe result as a failed parse", async () => {
      updateWhere("ok");

      await expect(
        executeDirectParseJob(job(() => Promise.resolve({ notRecipe: true }))),
      ).rejects.toThrow("Couldn't extract a recipe");
    });
  });

  describe("job row cannot be created", () => {
    it("throws without running the extraction", async () => {
      mockInsertValues.mockRejectedValue(new Error("db down"));
      const extract = vi.fn();

      await expect(executeDirectParseJob(job(extract))).rejects.toThrow(
        "Failed to start text parse",
      );
      expect(extract).not.toHaveBeenCalled();
    });
  });
});

describe("runDirectParseJob", () => {
  const request = new Request("http://localhost/api/parse-recipe/text");

  it("answers the recipe as JSON", async () => {
    updateWhere("ok");

    const response = await runDirectParseJob(
      request,
      job(() => Promise.resolve(RECIPE)),
    );

    expect(await response.json()).toEqual(RECIPE);
  });

  it("surfaces the raw parse error message with a 500", async () => {
    updateWhere("ok");

    const response = await runDirectParseJob(
      request,
      job(() => Promise.reject(new Error("quota exceeded"))),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "quota exceeded" });
    expect(mockCapture).toHaveBeenCalledOnce();
  });

  it("hands a start failure to ApiError.internal with a friendly message", async () => {
    mockInsertValues.mockRejectedValue(new Error("db down"));
    mockInternal.mockReturnValue(new Response(null, { status: 500 }));

    await runDirectParseJob(request, job(vi.fn()));

    expect(mockInternal).toHaveBeenCalledWith(
      expect.any(Error),
      request,
      "Failed to start text parse",
    );
  });
});
