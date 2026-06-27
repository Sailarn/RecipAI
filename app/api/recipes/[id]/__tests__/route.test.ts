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
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/db/schema/recipes", () => ({
  recipes: {},
}));

import { db } from "@/db";
import { auth } from "@/lib/auth/auth";
import { DELETE, PATCH } from "../route";

const mockSession = { user: { id: "user-1" } };

function makePatchRequest(id: string, body: object) {
  return {
    req: new Request(`http://localhost/api/recipes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as unknown as NextRequest,
    params: { params: Promise.resolve({ id }) },
  };
}

function makeDeleteRequest(id: string) {
  return {
    req: new Request(`http://localhost/api/recipes/${id}`, {
      method: "DELETE",
    }) as unknown as NextRequest,
    params: { params: Promise.resolve({ id }) },
  };
}

function setupUpdateChain() {
  const mockWhere = vi.fn().mockResolvedValue([]);
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);
  return { mockSet, mockWhere };
}

function setupDeleteChain() {
  const mockWhere = vi.fn().mockResolvedValue([]);
  vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as any);
  return { mockWhere };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PATCH /api/recipes/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as any);
    const { req, params } = makePatchRequest("r1", { title: "Updated" });

    const res = await PATCH(req, params);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns ok:true when authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
    setupUpdateChain();
    const { req, params } = makePatchRequest("r1", { title: "Updated" });

    const res = await PATCH(req, params);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it("sets updatedAt timestamp on update", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
    const { mockSet } = setupUpdateChain();
    const { req, params } = makePatchRequest("r1", { title: "Updated" });

    await PATCH(req, params);

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Updated",
        updatedAt: expect.any(Date),
      }),
    );
  });

  it("coerces a string createdAt to a Date so Drizzle never crashes (keep-mine snapshot)", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
    const { mockSet } = setupUpdateChain();
    const { req, params } = makePatchRequest("r1", {
      title: "Kept",
      createdAt: "2026-06-15T10:00:00.000Z",
      updatedAt: "2026-06-15T10:05:00.000Z",
    });

    await PATCH(req, params);

    const setArg = mockSet.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(typeof setArg.createdAt).not.toBe("string");
    expect(setArg.updatedAt).toBeInstanceOf(Date);
  });

  it("scopes update to the authenticated user", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
    const { mockWhere } = setupUpdateChain();
    const { req, params } = makePatchRequest("r1", { title: "Updated" });

    await PATCH(req, params);

    // .where() must be called (scopes by id AND userId)
    expect(mockWhere).toHaveBeenCalled();
  });

  it("ignores public visibility from normal updates", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
    const { mockSet } = setupUpdateChain();
    const { req, params } = makePatchRequest("r1", { isPublic: true });

    await PATCH(req, params);

    expect(mockSet.mock.calls[0]?.[0]).not.toHaveProperty("isPublic");
  });
});

describe("DELETE /api/recipes/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as any);
    const { req, params } = makeDeleteRequest("r1");

    const res = await DELETE(req, params);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns ok:true when authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
    setupDeleteChain();
    const { req, params } = makeDeleteRequest("r1");

    const res = await DELETE(req, params);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it("scopes delete to the authenticated user", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
    const { mockWhere } = setupDeleteChain();
    const { req, params } = makeDeleteRequest("r1");

    await DELETE(req, params);

    expect(mockWhere).toHaveBeenCalled();
  });
});
