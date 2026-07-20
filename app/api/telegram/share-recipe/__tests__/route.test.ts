import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionResult, selectLimit, getPublicRecipe, savePrepared } =
  vi.hoisted(() => ({
    requireSessionResult: {
      value: { session: { user: { id: "u1" } } } as Record<string, unknown>,
    },
    selectLimit: vi.fn(),
    getPublicRecipe: vi.fn(),
    savePrepared: vi.fn(),
  }));

vi.mock("@/lib/auth/require-session", () => ({
  requireSession: () => requireSessionResult.value,
}));
vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: selectLimit }) }),
    }),
  },
}));
vi.mock("@/db/schema/auth", () => ({ user: { id: {}, telegramId: {} } }));
vi.mock("@/lib/public-recipes/server", () => ({ getPublicRecipe }));
vi.mock("@/lib/telegram/recipe-inline-result", () => ({
  buildRecipeInlineResult: () => ({ type: "article" }),
}));
vi.mock("@/lib/telegram-bot", () => ({
  savePreparedInlineMessage: savePrepared,
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { POST } from "../route";

function makeRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
    headers: { get: () => null },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireSessionResult.value = { session: { user: { id: "u1" } } };
  selectLimit.mockResolvedValue([{ telegramId: "316693380" }]);
  getPublicRecipe.mockResolvedValue({ id: "rec-1", title: "Soup" });
  savePrepared.mockResolvedValue("pmi-1");
});

describe("POST /api/telegram/share-recipe", () => {
  it("returns 401 without a session", async () => {
    requireSessionResult.value = {
      response: new Response(null, { status: 401 }),
    };

    const res = await POST(makeRequest({ recipeId: "rec-1" }));

    expect(res.status).toBe(401);
  });

  it("returns 400 when recipeId is missing", async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
  });

  it("returns 404 for a non-public recipe", async () => {
    getPublicRecipe.mockResolvedValue(null);

    const res = await POST(makeRequest({ recipeId: "rec-1" }));

    expect(res.status).toBe(404);
  });

  it("returns 400 when the user has no linked Telegram id", async () => {
    selectLimit.mockResolvedValue([{ telegramId: null }]);

    const res = await POST(makeRequest({ recipeId: "rec-1" }));

    expect(res.status).toBe(400);
  });

  it("returns the prepared message id on success", async () => {
    const res = await POST(makeRequest({ recipeId: "rec-1" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ preparedMessageId: "pmi-1" });
    expect(savePrepared).toHaveBeenCalledWith("316693380", {
      type: "article",
    });
  });
});
