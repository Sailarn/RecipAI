import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: { update: vi.fn() },
}));
vi.mock("@/db/schema/ingredients", () => ({
  ingredients: { id: "id-column", embedding: "embedding-column" },
}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  eq: vi.fn(),
  isNull: vi.fn(),
}));
vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue({}) }));

import { db } from "@/db";
import { auth } from "@/lib/auth/auth";
import { PATCH } from "../route";

const EMBEDDING_DIM = 384;

function validEmbedding(): number[] {
  return Array(EMBEDDING_DIM).fill(0.1);
}

function mockSession(userId = "user-1") {
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: userId },
  } as never);
}

function setupUpdate() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  vi.mocked(db.update).mockReturnValue({ set } as never);
  return { set, where };
}

function makeReq(body: object) {
  return new Request("http://localhost/api/ingredients/abc", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }) as never;
}

const params = Promise.resolve({ id: "abc" });

beforeEach(() => vi.clearAllMocks());

describe("PATCH /api/ingredients/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const res = await PATCH(makeReq({ embedding: validEmbedding() }), {
      params,
    });

    expect(res.status).toBe(401);
  });

  it("returns 400 when embedding is missing", async () => {
    mockSession();

    const res = await PATCH(makeReq({}), { params });

    expect(res.status).toBe(400);
  });

  it("returns 400 when embedding has the wrong dimension", async () => {
    mockSession();

    const res = await PATCH(makeReq({ embedding: [1, 2, 3] }), { params });

    expect(res.status).toBe(400);
  });

  it("returns 400 when embedding contains a non-number", async () => {
    mockSession();
    const bad = validEmbedding();
    bad[0] = "x" as never;

    const res = await PATCH(makeReq({ embedding: bad }), { params });

    expect(res.status).toBe(400);
  });

  it("writes the embedding and returns success when valid", async () => {
    mockSession();
    const { set } = setupUpdate();
    const embedding = validEmbedding();

    const res = await PATCH(makeReq({ embedding }), { params });

    expect(res.status).toBe(200);
    expect(set).toHaveBeenCalledWith({ embedding });
  });
});
