import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/db/schema/parse-jobs", () => ({
  parseJobs: {},
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

beforeEach(() => {
  vi.clearAllMocks();
});

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
    };
    setupSelectChain([mockJob]);
    const { req, params } = makeRequest("job-3");

    const res = await GET(req, params);

    const body = await res.json();
    expect(body.status).toBe(PARSE_JOB_STATUS.PENDING);
    expect(body.result).toBeNull();
  });
});
