import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/db/schema/pantry", () => ({ pantry: { id: "id-column" } }));
vi.mock("drizzle-orm", () => ({ and: vi.fn(), eq: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue({}) }));

import { db } from "@/db";
import { pantry as pantrySchema } from "@/db/schema/pantry";
import { auth } from "@/lib/auth/auth";
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

function setupSelect(rows: { id: string }[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  vi.mocked(db.select).mockReturnValue({ from } as never);
}

function setupUpdate() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  vi.mocked(db.update).mockReturnValue({ set } as never);
  return { set, where };
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

  it("updates the existing row in place when (user, ingredient) already exists", async () => {
    mockSession();
    setupSelect([{ id: "existing-id" }]);
    const { set } = setupUpdate();

    const res = await POST(
      makePostReq({
        id: "new-id",
        ingredientId: "vocab-1",
        name: "Milk",
        qty: 2,
        unit: "l",
        cat: "Dairy",
        on: true,
      }),
    );

    expect(res.status).toBe(200);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Milk", qty: 2, on: true }),
    );
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("inserts a new row when (user, ingredient) is not present", async () => {
    mockSession();
    setupSelect([]);
    setupUpdate();
    const { onConflictDoUpdate } = setupInsert();

    const res = await POST(
      makePostReq({
        id: "new-id",
        ingredientId: "vocab-2",
        name: "Flour",
        qty: 1,
        unit: "kg",
        cat: "Pantry",
        on: true,
      }),
    );

    expect(res.status).toBe(200);
    expect(onConflictDoUpdate).toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
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
