import type { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/db/schema/parse-jobs", () => ({
  parseJobs: {},
}));

const findRecipeIdBySource = vi.hoisted(() => vi.fn());
vi.mock("@/lib/parse-recipe/find-recipe-by-source", () => ({
  findRecipeIdBySource,
}));

const failStaleParseJobs = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined),
);
vi.mock("@/lib/parse-recipe/stale-parse-jobs", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/lib/parse-recipe/stale-parse-jobs")
  >()),
  failStaleParseJobs,
}));

import { db } from "@/db";
import { PARSE_JOB_STATUS } from "@/lib/db/schema";
import { GET } from "../route";

function makeRequest(id: string) {
  return {
    req: new Request(
      `http://localhost/api/parse-queue/${id}`,
    ) as unknown as NextRequest,
    params: { params: Promise.resolve({ id }) },
  };
}

function setupSelectChain(result: object[]) {
  const mockWhere = vi.fn().mockResolvedValue(result);
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);
  return { mockWhere, mockFrom };
}

describe("GET /api/parse-queue/[id]", () => {
  it("returns 404 when job is not found", async () => {
    setupSelectChain([]);
    const { req, params } = makeRequest("nonexistent-id");

    const res = await GET(req, params);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "Job not found" });
  });

  it("returns job status, result and error when found", async () => {
    const mockJob = {
      id: "job-1",
      status: PARSE_JOB_STATUS.DONE,
      result: { title: "Pasta", servings: 2 },
      error: null,
      url: "https://example.com/pasta",
    };
    setupSelectChain([mockJob]);
    const { req, params } = makeRequest("job-1");

    const res = await GET(req, params);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      status: PARSE_JOB_STATUS.DONE,
      result: { title: "Pasta", servings: 2 },
      error: null,
      url: "https://example.com/pasta",
    });
  });

  it("returns job with failed status and error message", async () => {
    const mockJob = {
      id: "job-2",
      status: PARSE_JOB_STATUS.FAILED,
      result: null,
      error: "Could not parse",
      url: "https://example.com/broken",
    };
    setupSelectChain([mockJob]);
    const { req, params } = makeRequest("job-2");

    const res = await GET(req, params);

    const body = await res.json();
    expect(body).toEqual({
      status: PARSE_JOB_STATUS.FAILED,
      result: null,
      error: "Could not parse",
      url: "https://example.com/broken",
    });
  });

  it("returns pending job with null result", async () => {
    const mockJob = {
      id: "job-3",
      status: PARSE_JOB_STATUS.PENDING,
      result: null,
      error: null,
      updatedAt: new Date(),
    };
    setupSelectChain([mockJob]);
    const { req, params } = makeRequest("job-3");

    const res = await GET(req, params);

    const body = await res.json();
    expect(body.status).toBe(PARSE_JOB_STATUS.PENDING);
    expect(body.result).toBeNull();
  });

  describe("stuck jobs", () => {
    it("fails a job that has been processing for over ten minutes", async () => {
      setupSelectChain([
        {
          id: "job-1",
          status: PARSE_JOB_STATUS.PROCESSING,
          url: "https://example.com/r",
          updatedAt: new Date(Date.now() - 11 * 60_000),
        },
      ]);
      const { req, params } = makeRequest("job-1");

      const body = await (await GET(req, params)).json();

      expect(failStaleParseJobs).toHaveBeenCalledOnce();
      expect(body).toMatchObject({
        status: PARSE_JOB_STATUS.FAILED,
        error: "Parsing timed out — the job never finished.",
        url: "https://example.com/r",
      });
    });

    it("leaves a recently updated job alone", async () => {
      failStaleParseJobs.mockClear();
      setupSelectChain([
        {
          id: "job-1",
          status: PARSE_JOB_STATUS.PENDING,
          updatedAt: new Date(Date.now() - 60_000),
        },
      ]);
      const { req, params } = makeRequest("job-1");

      const body = await (await GET(req, params)).json();

      expect(failStaleParseJobs).not.toHaveBeenCalled();
      expect(body.status).toBe(PARSE_JOB_STATUS.PENDING);
    });
  });

  describe("saved recipe", () => {
    it("points a finished signed-in link import at the saved recipe", async () => {
      findRecipeIdBySource.mockResolvedValue("recipe-9");
      setupSelectChain([
        {
          id: "job-1",
          userId: "user-1",
          url: "https://example.com/r",
          status: PARSE_JOB_STATUS.DONE,
          result: { title: "Soup" },
          updatedAt: new Date(),
        },
      ]);
      const { req, params } = makeRequest("job-1");

      const body = await (await GET(req, params)).json();

      expect(findRecipeIdBySource).toHaveBeenCalledWith(
        "user-1",
        "https://example.com/r",
      );
      expect(body.savedRecipeId).toBe("recipe-9");
    });

    it("has no saved recipe for an anonymous job", async () => {
      findRecipeIdBySource.mockClear();
      setupSelectChain([
        {
          id: "job-1",
          userId: null,
          url: "https://example.com/r",
          status: PARSE_JOB_STATUS.DONE,
          updatedAt: new Date(),
        },
      ]);
      const { req, params } = makeRequest("job-1");

      const body = await (await GET(req, params)).json();

      expect(findRecipeIdBySource).not.toHaveBeenCalled();
      expect(body.savedRecipeId).toBeUndefined();
    });
  });
});
