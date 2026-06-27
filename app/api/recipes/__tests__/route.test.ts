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
  },
}));

vi.mock("@/db/schema/recipes", () => ({
  recipes: {},
}));

import { db } from "@/db";
import { auth } from "@/lib/auth/auth";
import { POST } from "../route";

const mockSession = { user: { id: "user-1" } };

function makeRequest(body: object) {
  return new Request("http://localhost/api/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function setupInsertChain(
  insertedRows: Array<{ id: string }> = [{ id: "r1" }],
) {
  const mockReturning = vi.fn().mockResolvedValue(insertedRows);
  const mockOnConflictDoNothing = vi
    .fn()
    .mockReturnValue({ returning: mockReturning });
  const mockValues = vi
    .fn()
    .mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
  vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);
  return { mockValues, mockOnConflictDoNothing, mockReturning };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/recipes", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as any);

    const res = await POST(
      makeRequest({
        id: "r1",
        title: "Test",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      }),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns created:true when a row is inserted", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
    setupInsertChain([{ id: "r1" }]);

    const res = await POST(
      makeRequest({
        id: "r1",
        title: "Test",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ created: true });
  });

  it("returns created:false when the row already exists (conflict skipped)", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
    setupInsertChain([]);

    const res = await POST(
      makeRequest({
        id: "r1",
        title: "Test",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ created: false });
  });

  it("inserts with userId from session and converts dates", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
    const { mockValues } = setupInsertChain();

    await POST(
      makeRequest({
        id: "r1",
        title: "Test",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-02-01T00:00:00.000Z",
      }),
    );

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-02-01T00:00:00.000Z"),
      }),
    );
  });

  it("ignores public visibility from normal creates", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
    const { mockValues } = setupInsertChain();

    await POST(
      makeRequest({
        id: "r1",
        title: "Test",
        servings: 1,
        ingredients: [],
        instructions: [],
        isPublic: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      }),
    );

    expect(mockValues.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ isPublic: false }),
    );
  });
});
