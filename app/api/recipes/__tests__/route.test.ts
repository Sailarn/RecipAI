import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth", () => ({
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
import { auth } from "@/lib/auth";
import { POST } from "../route";

const mockSession = { user: { id: "user-1" } };

function makeRequest(body: object) {
  return new Request("http://localhost/api/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
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

  it("returns ok:true when authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
    setupInsertChain();

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
    expect(body).toEqual({ ok: true });
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
});
