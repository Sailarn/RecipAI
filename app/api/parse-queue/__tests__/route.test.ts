import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectLimit } = vi.hoisted(() => ({ selectLimit: vi.fn() }));

vi.mock("@/db", () => {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: selectLimit,
  };
  return {
    db: {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
      select: vi.fn(() => chain),
    },
  };
});
vi.mock("@/db/schema/parse-jobs", () => ({ parseJobs: {} }));
vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("@/lib/auth/require-session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  enforceParseRateLimit: vi.fn().mockResolvedValue(null),
}));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/upload/upload-token", () => ({
  mintUploadToken: vi.fn().mockResolvedValue("mock-upload-token"),
}));

import { auth } from "@/lib/auth/auth";
import { requireSession } from "@/lib/auth/require-session";
import { enforceParseRateLimit } from "@/lib/rate-limit";
import { mintUploadToken } from "@/lib/upload/upload-token";
import { GET, POST } from "../route";

function makeRequest(body: object) {
  return {
    json: () => Promise.resolve(body),
  } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(null);
  vi.mocked(mintUploadToken).mockResolvedValue("mock-upload-token");
  vi.mocked(enforceParseRateLimit).mockResolvedValue(null);
  // Default: cache miss (no prior parsed job for this URL).
  selectLimit.mockResolvedValue([]);
});

describe("POST /api/parse-queue", () => {
  it("returns 400 when URL is missing", async () => {
    const res = await POST(makeRequest({}) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "URL required" });
  });

  it("returns the rate-limit response when over the limit", async () => {
    vi.mocked(enforceParseRateLimit).mockResolvedValue(
      new Response(null, { status: 429 }) as never,
    );

    const res = await POST(
      makeRequest({ url: "https://example.com/recipe" }) as never,
    );

    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = { json: () => Promise.reject(new Error("bad JSON")) } as never;

    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns jobId and uploadToken on success", async () => {
    const res = await POST(
      makeRequest({ url: "https://example.com/recipe" }) as never,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.jobId).toBe("string");
    expect(body.uploadToken).toBe("mock-upload-token");
  });

  it("enqueues a PENDING job on a cache miss", async () => {
    selectLimit.mockResolvedValue([]);
    const { db } = await import("@/db");

    const res = await POST(
      makeRequest({ url: "https://example.com/recipe" }) as never,
    );

    expect((await res.json()).cached).toBe(false);
    const insertValues = vi.mocked(db.insert).mock.results[0]?.value?.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" }),
    );
  });

  it("clones the cached result into a DONE job on a cache hit", async () => {
    selectLimit.mockResolvedValue([{ result: { title: "Cached Pasta" } }]);
    const { db } = await import("@/db");

    const res = await POST(
      makeRequest({ url: "https://example.com/recipe" }) as never,
    );

    expect((await res.json()).cached).toBe(true);
    const insertValues = vi.mocked(db.insert).mock.results[0]?.value?.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "done",
        result: { title: "Cached Pasta" },
        parserVersion: "1",
      }),
    );
  });

  it("stores userId from session when user is logged in", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-42" },
    } as never);

    const { db } = await import("@/db");

    const res = await POST(
      makeRequest({ url: "https://example.com/recipe" }) as never,
    );

    expect(res.status).toBe(200);
    const insertValues = vi.mocked(db.insert).mock.results[0]?.value?.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-42" }),
    );
  });

  it("stores null userId for anonymous parse", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const { db } = await import("@/db");

    const res = await POST(
      makeRequest({ url: "https://example.com/recipe" }) as never,
    );

    expect(res.status).toBe(200);
    const insertValues = vi.mocked(db.insert).mock.results[0]?.value?.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null }),
    );
  });

  it("stores null userId when the session id is an empty string", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "" },
    } as never);

    const { db } = await import("@/db");

    await POST(makeRequest({ url: "https://example.com/recipe" }) as never);

    const insertValues = vi.mocked(db.insert).mock.results[0]?.value?.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null }),
    );
  });

  it("stores the pushEndpoint when provided", async () => {
    const { db } = await import("@/db");

    await POST(
      makeRequest({
        url: "https://example.com/recipe",
        pushEndpoint: "https://web.push.apple.com/abc",
      }) as never,
    );

    const insertValues = vi.mocked(db.insert).mock.results[0]?.value?.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        pushEndpoint: "https://web.push.apple.com/abc",
      }),
    );
  });

  it("stores null pushEndpoint when omitted", async () => {
    const { db } = await import("@/db");

    await POST(makeRequest({ url: "https://example.com/recipe" }) as never);

    const insertValues = vi.mocked(db.insert).mock.results[0]?.value?.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ pushEndpoint: null }),
    );
  });

  it("mints an upload token on every successful request", async () => {
    await POST(makeRequest({ url: "https://example.com/recipe" }) as never);

    expect(mintUploadToken).toHaveBeenCalledOnce();
  });

  it("does not insert a job when minting the upload token fails", async () => {
    vi.mocked(mintUploadToken).mockRejectedValue(new Error("redis down"));
    const { db } = await import("@/db");
    const req = {
      url: "http://localhost/api/parse-queue",
      json: () => Promise.resolve({ url: "https://example.com/recipe" }),
    } as unknown as never;

    const res = await POST(req);

    expect(res.status).toBe(500);
    expect(db.insert).not.toHaveBeenCalled();
  });
});

describe("GET /api/parse-queue", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      response: new Response(null, { status: 401 }) as never,
    });

    const res = await GET({} as never);

    expect(res.status).toBe(401);
  });

  it("returns the signed-in user's jobs", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      session: { user: { id: "user-1" } },
    } as never);
    const jobs = [
      {
        id: "job-1",
        url: "https://example.com/a",
        status: "done",
        result: { title: "A" },
        error: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    selectLimit.mockResolvedValue(jobs);

    const res = await GET({} as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.jobs).toEqual(jobs);
  });
});
