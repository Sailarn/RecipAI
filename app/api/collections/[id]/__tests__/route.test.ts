import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: { delete: vi.fn() },
}));
vi.mock("@/db/schema/collections", () => ({ collections: {} }));
vi.mock("drizzle-orm", () => ({ and: vi.fn(), eq: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue({}) }));

import { db } from "@/db";
import { auth } from "@/lib/auth";
import { DELETE } from "../route";

function makeReq(id: string) {
  return {
    req: new Request(`http://localhost/api/collections/${id}`, {
      method: "DELETE",
    }) as any,
    params: { params: Promise.resolve({ id }) },
  };
}

beforeEach(() => vi.clearAllMocks());

describe("DELETE /api/collections/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const { req, params } = makeReq("c1");
    const res = await DELETE(req, params);
    expect(res.status).toBe(401);
  });

  it("deletes collection and returns ok", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    const where = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.delete).mockReturnValue({ where } as any);

    const { req, params } = makeReq("c1");
    const res = await DELETE(req, params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
