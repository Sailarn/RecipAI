import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: { select: vi.fn(), insert: vi.fn() },
}));
vi.mock("@/db/schema/collections", () => ({ collections: {} }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));
vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue({}) }));

import { db } from "@/db";
import { auth } from "@/lib/auth/auth";
import { GET, POST } from "../route";

function makeReq(body?: object) {
  return new Request("http://localhost/api/collections", {
    method: body ? "POST" : "GET",
    ...(body
      ? {
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        }
      : {}),
  }) as any;
}

function mockSession(userId = "user-1") {
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: userId },
  } as any);
}

function setupSelect(result: object[]) {
  const where = vi.fn().mockResolvedValue(result);
  const from = vi.fn().mockReturnValue({ where });
  vi.mocked(db.select).mockReturnValue({ from } as any);
}

function setupInsert() {
  const values = vi.fn().mockResolvedValue(undefined);
  vi.mocked(db.insert).mockReturnValue({ values } as any);
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/collections", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns user collections", async () => {
    mockSession();
    setupSelect([{ id: "c1", name: "Favourites", emoji: "⭐" }]);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.collections).toHaveLength(1);
    expect(body.collections[0].name).toBe("Favourites");
  });
});

describe("POST /api/collections", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const res = await POST(makeReq({ name: "Test", emoji: "⭐" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    mockSession();
    const res = await POST(makeReq({ emoji: "⭐" }));
    expect(res.status).toBe(400);
  });

  it("creates collection and returns it", async () => {
    mockSession();
    setupInsert();
    const res = await POST(makeReq({ name: "Favourites", emoji: "⭐" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.collection.name).toBe("Favourites");
    expect(body.collection.emoji).toBe("⭐");
    expect(body.collection.id).toBeDefined();
  });

  it("uses client-provided id so local and server ids stay in sync", async () => {
    mockSession();
    setupInsert();
    const res = await POST(
      makeReq({ name: "Dinner", emoji: "🍽️", id: "client-id-123" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.collection.id).toBe("client-id-123");
  });
});
