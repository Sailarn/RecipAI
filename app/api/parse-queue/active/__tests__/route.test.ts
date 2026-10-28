import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireSession, mockFailStale, mockWhere } = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
  mockFailStale: vi.fn(),
  mockWhere: vi.fn(),
}));

vi.mock("@/lib/auth/require-session", () => ({
  requireSession: mockRequireSession,
}));
vi.mock("@/lib/parse-recipe/stale-parse-jobs", () => ({
  ACTIVE_PARSE_JOB_STATUSES: ["pending", "processing"],
  failStaleParseJobs: mockFailStale,
}));
vi.mock("@/db", () => ({
  db: { select: () => ({ from: () => ({ where: mockWhere }) }) },
}));

import type { NextRequest } from "next/server";
import { GET } from "../route";

const request = new Request(
  "http://localhost/api/parse-queue/active",
) as unknown as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ session: { user: { id: "u1" } } });
  mockFailStale.mockResolvedValue(undefined);
  mockWhere.mockResolvedValue([{ id: "job-1" }]);
});

describe("GET /api/parse-queue/active", () => {
  it("returns the auth response for a signed-out caller", async () => {
    const unauthorized = new Response(null, { status: 401 });
    mockRequireSession.mockResolvedValue({ response: unauthorized });

    expect(await GET(request)).toBe(unauthorized);
    expect(mockWhere).not.toHaveBeenCalled();
  });

  it("fails the user's stuck jobs before listing the active ones", async () => {
    const response = await GET(request);

    expect(mockFailStale).toHaveBeenCalledOnce();
    expect(mockFailStale.mock.invocationCallOrder[0]).toBeLessThan(
      mockWhere.mock.invocationCallOrder[0],
    );
    expect(await response.json()).toEqual({ jobs: [{ id: "job-1" }] });
  });

  it("answers 500 when the lookup fails", async () => {
    mockWhere.mockRejectedValue(new Error("db down"));

    expect((await GET(request)).status).toBe(500);
  });
});
