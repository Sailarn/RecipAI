import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}));

vi.mock("@/db/schema/recipes", () => ({
  recipes: {},
}));

import { db } from "@/db";
import { auth } from "@/lib/auth/auth";
import { GET, POST } from "../route";

const mockSession = { user: { id: "user-1" } };

function makePostRequest(body: object) {
  return new Request("http://localhost/api/recipes/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function makeGetRequest() {
  return new Request(
    "http://localhost/api/recipes/sync",
  ) as unknown as NextRequest;
}

function setupSelectChain(result: object[]) {
  const mockWhere = vi.fn().mockResolvedValue(result);
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);
  return { mockWhere, mockFrom };
}

function setupInsertChain() {
  const mockOnConflictDoNothing = vi.fn().mockResolvedValue([]);
  const mockValues = vi
    .fn()
    .mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
  vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
  return { mockValues, mockOnConflictDoNothing };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/recipes/sync", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as any);

    const res = await POST(makePostRequest({ recipes: [] }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns synced:0 when recipes array is empty", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);

    const res = await POST(makePostRequest({ recipes: [] }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ synced: 0 });
  });

  it("returns synced:0 when recipes key is missing", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);

    const res = await POST(makePostRequest({}));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ synced: 0 });
  });

  it("inserts only new recipes (deduplication)", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);

    const localRecipes = [
      {
        id: "existing-1",
        title: "Old",
        servings: 2,
        ingredients: [],
        instructions: [],
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      {
        id: "new-1",
        title: "New",
        servings: 2,
        ingredients: [],
        instructions: [],
        createdAt: "2024-01-02T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
      },
    ];

    // select returns existing-1 already in DB
    setupSelectChain([{ id: "existing-1" }]);
    const { mockValues } = setupInsertChain();

    const res = await POST(makePostRequest({ recipes: localRecipes }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ synced: 1 });

    // Only new-1 should be inserted
    expect(mockValues).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "new-1" })]),
    );
    const insertedRows = vi.mocked(mockValues).mock.calls[0][0] as any[];
    expect(insertedRows.some((r: any) => r.id === "existing-1")).toBe(false);
  });

  it("inserts with userId from session and converts dates", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);

    const localRecipes = [
      {
        id: "new-1",
        title: "New",
        servings: 2,
        ingredients: [],
        instructions: [],
        createdAt: "2024-01-02T00:00:00.000Z",
        updatedAt: "2024-01-03T00:00:00.000Z",
      },
    ];

    setupSelectChain([]);
    const { mockValues } = setupInsertChain();

    await POST(makePostRequest({ recipes: localRecipes }));

    const rows = vi.mocked(mockValues).mock.calls[0][0] as any[];
    expect(rows[0]).toMatchObject({
      id: "new-1",
      userId: "user-1",
      createdAt: new Date("2024-01-02T00:00:00.000Z"),
      updatedAt: new Date("2024-01-03T00:00:00.000Z"),
    });
  });

  it("does not call insert when all recipes already exist", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);

    const localRecipes = [
      {
        id: "existing-1",
        title: "Old",
        servings: 2,
        ingredients: [],
        instructions: [],
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    ];

    setupSelectChain([{ id: "existing-1" }]);

    const res = await POST(makePostRequest({ recipes: localRecipes }));

    const body = await res.json();
    expect(body).toEqual({ synced: 0 });
    expect(db.insert).not.toHaveBeenCalled();
  });
});

describe("GET /api/recipes/sync", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as any);

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns user's recipes", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);

    const userRecipes = [
      { id: "r1", title: "Recipe 1", userId: "user-1" },
      { id: "r2", title: "Recipe 2", userId: "user-1" },
    ];
    setupSelectChain(userRecipes);

    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ recipes: userRecipes });
  });

  it("returns empty array when user has no recipes", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
    setupSelectChain([]);

    const res = await GET(makeGetRequest());

    const body = await res.json();
    expect(body).toEqual({ recipes: [] });
  });
});
