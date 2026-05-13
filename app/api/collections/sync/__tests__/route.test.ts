import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: { select: vi.fn(), insert: vi.fn() },
}));
vi.mock("@/db/schema/collections", () => ({ collections: {} }));
vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  eq: vi.fn(),
  inArray: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue({}) }));

import { db } from "@/db";
import { auth } from "@/lib/auth";
import { POST } from "../route";

function makeReq(body: object) {
  return new Request("http://localhost/api/collections/sync", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }) as any;
}

function mockSession(userId = "user-1") {
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: userId },
  } as any);
}

function setupSelect(existingIds: string[]) {
  const where = vi.fn().mockResolvedValue(existingIds.map((id) => ({ id })));
  const from = vi.fn().mockReturnValue({ where });
  vi.mocked(db.select).mockReturnValue({ from } as any);
}

function setupInsert() {
  const values = vi.fn().mockResolvedValue(undefined);
  vi.mocked(db.insert).mockReturnValue({ values } as any);
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/collections/sync", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const res = await POST(makeReq({ collections: [] }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when collections is not an array", async () => {
    mockSession();
    const res = await POST(makeReq({ collections: "bad" }));
    expect(res.status).toBe(400);
  });

  it("returns synced: 0 when collections array is empty", async () => {
    mockSession();
    const res = await POST(makeReq({ collections: [] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.synced).toBe(0);
  });

  it("inserts only collections not already on server", async () => {
    mockSession();
    setupSelect(["c1"]); // c1 already exists
    setupInsert();

    const res = await POST(
      makeReq({
        collections: [
          { id: "c1", name: "Existing", emoji: "⭐" },
          { id: "c2", name: "New", emoji: "🔥" },
        ],
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.synced).toBe(1);
    expect(db.insert).toHaveBeenCalled();
  });

  it("returns synced: 0 when all collections already exist", async () => {
    mockSession();
    setupSelect(["c1", "c2"]);

    const res = await POST(
      makeReq({
        collections: [
          { id: "c1", name: "Old", emoji: "⭐" },
          { id: "c2", name: "Old2", emoji: "🔥" },
        ],
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.synced).toBe(0);
    expect(db.insert).not.toHaveBeenCalled();
  });
});
