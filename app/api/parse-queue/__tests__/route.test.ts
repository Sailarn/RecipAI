import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));
vi.mock("@/db/schema/parse-jobs", () => ({ parseJobs: {} }));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/upload-token", () => ({
  mintUploadToken: vi.fn().mockResolvedValue("mock-upload-token"),
}));

import { auth } from "@/lib/auth";
import { mintUploadToken } from "@/lib/upload-token";
import { POST } from "../route";

function makeRequest(body: object) {
  return {
    json: () => Promise.resolve(body),
  } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(null);
  vi.mocked(mintUploadToken).mockResolvedValue("mock-upload-token");
});

describe("POST /api/parse-queue", () => {
  it("returns 400 when URL is missing", async () => {
    const res = await POST(makeRequest({}) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "URL required" });
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

  it("mints an upload token on every successful request", async () => {
    await POST(makeRequest({ url: "https://example.com/recipe" }) as never);

    expect(mintUploadToken).toHaveBeenCalledOnce();
  });
});
