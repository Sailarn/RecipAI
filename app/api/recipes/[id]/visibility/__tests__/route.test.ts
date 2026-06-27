import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("@/db", () => {
  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  };
  db.transaction.mockImplementation(
    (callback: (transaction: typeof db) => unknown) => callback(db),
  );
  return { db };
});
vi.mock("@/db/schema/recipes", () => ({ recipes: {} }));

import { db } from "@/db";
import { auth } from "@/lib/auth/auth";
import { PUT } from "../route";

const params = { params: Promise.resolve({ id: "recipe-1" }) };
const recipe = {
  id: "recipe-1",
  title: "Soup",
  servings: 2,
  ingredients: [],
  instructions: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function request(body: object) {
  return new Request("http://localhost/api/recipes/recipe-1/visibility", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

function selectOwner(userId?: string) {
  const limit = vi.fn().mockResolvedValue(userId ? [{ userId }] : []);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  vi.mocked(db.select).mockReturnValue({ from } as never);
}

function updateChain() {
  const returning = vi.fn().mockResolvedValue([{ id: "recipe-1" }]);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  vi.mocked(db.update).mockReturnValue({ set } as never);
  return { set };
}

function insertChain() {
  const values = vi.fn().mockResolvedValue(undefined);
  vi.mocked(db.insert).mockReturnValue({ values } as never);
  return { values };
}

beforeEach(() => vi.clearAllMocks());

describe("PUT recipe visibility", () => {
  it("requires authentication", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as never);
    expect((await PUT(request({ isPublic: false }), params)).status).toBe(401);
  });

  it("rejects publication without a complete recipe", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    expect((await PUT(request({ isPublic: true }), params)).status).toBe(400);
  });

  it("rejects publication with invalid timestamps", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    expect(
      (
        await PUT(
          request({
            isPublic: true,
            recipe: { ...recipe, updatedAt: "not-a-date" },
          }),
          params,
        )
      ).status,
    ).toBe(400);
  });

  it("rejects another user's recipe", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    selectOwner("user-2");
    expect(
      (await PUT(request({ isPublic: true, recipe }), params)).status,
    ).toBe(404);
  });

  it("publishes current content for its owner", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    selectOwner("user-1");
    const { set } = updateChain();
    const response = await PUT(request({ isPublic: true, recipe }), params);
    expect(response.status).toBe(200);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Soup", isPublic: true }),
    );
  });

  it("publishes a local recipe that has not synced yet", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    selectOwner();
    const { values } = insertChain();

    const response = await PUT(request({ isPublic: true, recipe }), params);

    expect(response.status).toBe(200);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "recipe-1",
        title: "Soup",
        userId: "user-1",
        isPublic: true,
      }),
    );
  });

  it("revokes access synchronously", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    selectOwner("user-1");
    const { set } = updateChain();
    expect((await PUT(request({ isPublic: false }), params)).status).toBe(200);
    expect(set).toHaveBeenCalledWith({ isPublic: false });
  });
});
