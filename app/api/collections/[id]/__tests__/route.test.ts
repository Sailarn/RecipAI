import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: { delete: vi.fn(), update: vi.fn() },
}));
vi.mock("@/db/schema/collections", () => ({ collections: {} }));
vi.mock("drizzle-orm", () => ({ and: vi.fn(), eq: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue({}) }));

import { db } from "@/db";
import { auth } from "@/lib/auth";
import { DELETE, PATCH } from "../route";

function makeDeleteReq(id: string) {
  return {
    req: new Request(`http://localhost/api/collections/${id}`, {
      method: "DELETE",
    }) as any,
    params: { params: Promise.resolve({ id }) },
  };
}

function makePatchReq(id: string, body: object) {
  return {
    req: new Request(`http://localhost/api/collections/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }) as any,
    params: { params: Promise.resolve({ id }) },
  };
}

function mockSession(userId = "user-1") {
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: userId },
  } as any);
}

function setupUpdate() {
  const set = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });
  vi.mocked(db.update).mockReturnValue({ set } as any);
}

beforeEach(() => vi.clearAllMocks());

describe("DELETE /api/collections/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const { req, params } = makeDeleteReq("c1");
    const res = await DELETE(req, params);
    expect(res.status).toBe(401);
  });

  it("deletes collection and returns ok", async () => {
    mockSession();
    const where = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.delete).mockReturnValue({ where } as any);
    const { req, params } = makeDeleteReq("c1");
    const res = await DELETE(req, params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

describe("PATCH /api/collections/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const { req, params } = makePatchReq("c1", { name: "New", emoji: "🔥" });
    const res = await PATCH(req, params);
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    mockSession();
    const { req, params } = makePatchReq("c1", { emoji: "🔥" });
    const res = await PATCH(req, params);
    expect(res.status).toBe(400);
  });

  it("updates collection and returns ok", async () => {
    mockSession();
    setupUpdate();
    const { req, params } = makePatchReq("c1", {
      name: "New Name",
      emoji: "🔥",
    });
    const res = await PATCH(req, params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
