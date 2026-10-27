import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockWhere, mockInsertValues, mockRequireSession } = vi.hoisted(() => ({
  mockWhere: vi.fn(),
  mockInsertValues: vi.fn(),
  mockRequireSession: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: mockWhere }) }),
    insert: () => ({ values: mockInsertValues }),
  },
}));
vi.mock("@/lib/auth/require-session", () => ({
  requireSession: mockRequireSession,
}));
vi.mock("@/lib/telemetry", () => ({ log: vi.fn(), captureError: vi.fn() }));

import { GET, POST } from "../route";

function vocabRow(id: string, updatedAt: string) {
  return {
    id,
    en: id,
    ua: null,
    category: "other",
    aliasesEn: [],
    aliasesUa: [],
    status: "confirmed",
    retryCount: 0,
    lastAttemptAt: null,
    updatedAt: new Date(updatedAt),
  };
}

function getRequest(since?: string) {
  const url = new URL("http://localhost/api/ingredients");
  if (since) url.searchParams.set("since", since);
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/ingredients", () => {
  it("returns rows without updatedAt and the newest updatedAt as watermark", async () => {
    mockWhere.mockResolvedValue([
      vocabRow("salt", "2026-10-01T00:00:00.000Z"),
      vocabRow("flour", "2026-10-03T00:00:00.000Z"),
    ]);

    const body = await (await GET(getRequest())).json();

    expect(body.ingredients.map((row: { id: string }) => row.id)).toEqual([
      "salt",
      "flour",
    ]);
    expect(body.ingredients[0]).not.toHaveProperty("updatedAt");
    expect(body.serverMaxUpdatedAt).toBe("2026-10-03T00:00:00.000Z");
  });

  it("returns no watermark for an empty delta, so the client keeps its own", async () => {
    mockWhere.mockResolvedValue([]);

    const body = await (
      await GET(getRequest("2026-10-01T00:00:00.000Z"))
    ).json();

    expect(body).toEqual({ ingredients: [], serverMaxUpdatedAt: "" });
  });

  it("answers 500 when the query fails", async () => {
    mockWhere.mockRejectedValue(new Error("db down"));

    const response = await GET(getRequest());

    expect(response.status).toBe(500);
  });
});

describe("POST /api/ingredients", () => {
  function postRequest(body: unknown) {
    return new NextRequest("http://localhost/api/ingredients", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  beforeEach(() => {
    mockRequireSession.mockResolvedValue({
      session: { user: { id: "user-1" } },
    });
    mockInsertValues.mockReturnValue({
      onConflictDoNothing: () => Promise.resolve(),
    });
  });

  it("rejects an unauthenticated caller", async () => {
    const unauthorized = new Response(null, { status: 401 });
    mockRequireSession.mockResolvedValue({ response: unauthorized });

    expect(await POST(postRequest({ id: "x", en: "x" }))).toBe(unauthorized);
  });

  it("rejects a body without id and en", async () => {
    const response = await POST(postRequest({ en: "salt" }));

    expect(response.status).toBe(400);
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(postRequest("{"));

    expect(response.status).toBe(400);
  });

  it("inserts a provisional entry with defaults", async () => {
    const response = await POST(postRequest({ id: "uuid-1", en: "sumac" }));

    expect(await response.json()).toEqual({ id: "uuid-1" });
    expect(mockInsertValues).toHaveBeenCalledWith({
      id: "uuid-1",
      en: "sumac",
      ua: null,
      category: "other",
      aliasesEn: [],
      aliasesUa: [],
      status: "provisional",
    });
  });
});
