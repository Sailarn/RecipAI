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
      status: "done",
      result: { title: "Pasta", servings: 2 },
      error: null,
    };
    setupSelectChain([mockJob]);
    const { req, params } = makeRequest("job-1");

    const res = await GET(req, params);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      status: "done",
      result: { title: "Pasta", servings: 2 },
      error: null,
    });
  });

  it("returns job with failed status and error message", async () => {
    const mockJob = {
      id: "job-2",
      status: "failed",
      result: null,
      error: "Could not parse",
    };
    setupSelectChain([mockJob]);
    const { req, params } = makeRequest("job-2");

    const res = await GET(req, params);

    const body = await res.json();
    expect(body).toEqual({
      status: "failed",
      result: null,
      error: "Could not parse",
    });
  });

  it("returns pending job with null result", async () => {
    const mockJob = {
      id: "job-3",
      status: "pending",
      result: null,
      error: null,
    };
    setupSelectChain([mockJob]);
    const { req, params } = makeRequest("job-3");

    const res = await GET(req, params);

    const body = await res.json();
    expect(body.status).toBe("pending");
    expect(body.result).toBeNull();
  });
});
