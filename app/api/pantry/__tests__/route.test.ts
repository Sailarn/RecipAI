import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/db/schema/pantry", () => ({ pantry: { id: "id-column" } }));
vi.mock("drizzle-orm", () => ({ and: vi.fn(), eq: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue({}) }));

import { db } from "@/db";
import { pantry as pantrySchema } from "@/db/schema/pantry";
import { auth } from "@/lib/auth";
import { DELETE, POST } from "../route";

function mockSession(userId = "user-1") {
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: userId },
  } as never);
}

function setupInsert() {
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
  vi.mocked(db.insert).mockReturnValue({ values } as never);
  return { onConflictDoUpdate };
}

function setupDelete() {
  const where = vi.fn().mockResolvedValue(undefined);
  vi.mocked(db.delete).mockReturnValue({ where } as never);
}

function makePostReq(body: object) {
  return new Request("http://localhost/api/pantry", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }) as never;
}

function makeDeleteReq(id: string | undefined) {
  return new Request("http://localhost/api/pantry", {
    method: "DELETE",
    body: JSON.stringify(id ? { id } : {}),
    headers: { "Content-Type": "application/json" },
  }) as never;
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/pantry", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const res = await POST(
      makePostReq({
        id: "1",
        name: "Eggs",
        qty: 1,
        unit: "pcs",
        cat: "Other",
        on: true,
      }),
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    mockSession();

    const res = await POST(makePostReq({ name: "Eggs" }));

    expect(res.status).toBe(400);
  });

  it("returns 200 for a valid upsert", async () => {
    mockSession();
    setupInsert();

    const res = await POST(
      makePostReq({
        id: "item-1",
        name: "Eggs",
        qty: 12,
        unit: "pcs",
        cat: "Dairy",
        on: true,
      }),
    );

    expect(res.status).toBe(200);
  });

  it("uses onConflictDoUpdate targeting pantry.id so toggle does not fail on conflict", async () => {
    mockSession();
    const { onConflictDoUpdate } = setupInsert();

    await POST(
      makePostReq({
        id: "item-1",
        name: "Eggs",
        qty: 12,
        unit: "pcs",
        cat: "Dairy",
        on: false,
      }),
    );

    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ target: pantrySchema.id }),
    );
  });
});

describe("DELETE /api/pantry", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const res = await DELETE(makeDeleteReq("item-1"));

    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    mockSession();

    const res = await DELETE(makeDeleteReq(undefined));

    expect(res.status).toBe(400);
  });

  it("returns 200 after deleting the row", async () => {
    mockSession();
    setupDelete();

    const res = await DELETE(makeDeleteReq("item-1"));

    expect(res.status).toBe(200);
  });
});
