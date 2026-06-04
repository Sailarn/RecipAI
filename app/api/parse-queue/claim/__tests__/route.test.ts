import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateWhere } = vi.hoisted(() => ({
  updateWhere: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db", () => {
  const chain = { set: vi.fn(() => chain), where: updateWhere };
  return { db: { update: vi.fn(() => chain) } };
});
vi.mock("@/db/schema/parse-jobs", () => ({ parseJobs: {} }));
vi.mock("@/lib/auth/require-session", () => ({ requireSession: vi.fn() }));

import { requireSession } from "@/lib/auth/require-session";
import { POST } from "../route";

function makeRequest(body: unknown) {
  return { json: () => Promise.resolve(body) } as unknown as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  updateWhere.mockResolvedValue(undefined);
  vi.mocked(requireSession).mockResolvedValue({
    session: { user: { id: "user-1" } },
  } as never);
});

describe("POST /api/parse-queue/claim", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireSession).mockResolvedValue({
      response: new Response(null, { status: 401 }) as never,
    });

    const res = await POST(makeRequest({ ids: ["a"] }));

    expect(res.status).toBe(401);
    expect(updateWhere).not.toHaveBeenCalled();
  });

  it("returns 400 when ids is missing or empty", async () => {
    expect((await POST(makeRequest({}))).status).toBe(400);
    expect((await POST(makeRequest({ ids: [] }))).status).toBe(400);
  });

  it("returns 400 when too many ids are sent", async () => {
    const ids = Array.from({ length: 201 }, (_, index) => `job-${index}`);

    const res = await POST(makeRequest({ ids }));

    expect(res.status).toBe(400);
    expect(updateWhere).not.toHaveBeenCalled();
  });

  it("updates matching jobs and returns ok", async () => {
    const res = await POST(makeRequest({ ids: ["job-1", "job-2"] }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(updateWhere).toHaveBeenCalledOnce();
  });
});
