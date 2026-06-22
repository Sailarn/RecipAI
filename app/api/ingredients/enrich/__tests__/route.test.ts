import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted so the db factory can close over them.
const {
  mockInsertOnConflict,
  mockSelectWhere,
  mockSelectLimit,
  mockUpdateWhere,
  mockTransaction,
  mockDeleteWhere,
  mockExecute,
} = vi.hoisted(() => ({
  mockInsertOnConflict: vi.fn(),
  mockSelectWhere: vi.fn(),
  mockSelectLimit: vi.fn(),
  mockUpdateWhere: vi.fn(),
  mockTransaction: vi.fn(),
  mockDeleteWhere: vi.fn(),
  mockExecute: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi
        .fn()
        .mockReturnValue({ onConflictDoNothing: mockInsertOnConflict }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({ where: mockSelectWhere }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: mockUpdateWhere }),
    }),
    delete: vi.fn().mockReturnValue({ where: mockDeleteWhere }),
    transaction: mockTransaction,
    execute: mockExecute,
  },
}));

vi.mock("@/db/schema/ingredients", () => ({ ingredients: {} }));
vi.mock("@/db/schema/pantry", () => ({ pantry: {} }));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  ne: vi.fn(),
  sql: vi.fn(),
}));

vi.mock("@/lib/ai", () => ({ callAiForIngredient: vi.fn() }));
vi.mock("@/lib/auth/require-session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/embed", () => ({ embed: vi.fn() }));
vi.mock("@/lib/telemetry", () => ({ log: vi.fn() }));

import { callAiForIngredient } from "@/lib/ai";
import { requireSession } from "@/lib/auth/require-session";
import { embed } from "@/lib/embed";
import { POST } from "../route";

function makeReq(body: object) {
  return {
    json: () => Promise.resolve(body),
  } as unknown as NextRequest;
}

const mockSession = {
  session: { user: { id: "user-1" } },
};

const provisionalEntry = { retryCount: 0, status: "provisional" };
const enrichedIngredient = {
  en: "salt",
  ua: "сіль",
  category: "spice",
  aliasesEn: ["table salt"],
  aliasesUa: ["солі"],
};

beforeEach(() => {
  vi.clearAllMocks();
  // Reset once-queues so no state bleeds between tests
  mockSelectWhere.mockReset();
  mockSelectLimit.mockReset();
  vi.mocked(requireSession).mockResolvedValue(mockSession as never);
  mockInsertOnConflict.mockResolvedValue(undefined);
  mockUpdateWhere.mockResolvedValue(undefined);
  mockDeleteWhere.mockResolvedValue(undefined);
  mockExecute.mockResolvedValue(undefined);
  vi.mocked(callAiForIngredient).mockResolvedValue(enrichedIngredient as never);
  vi.mocked(embed).mockResolvedValue([[...Array(384).fill(0.1)]]);
});

describe("POST /api/ingredients/enrich", () => {
  describe("merge-on-enrich: canonical of same name exists", () => {
    it("returns mergedInto and does not confirm the provisional in place", async () => {
      // First select: fetch entry → provisional
      // Second select: canonical lookup → existing slug entry found
      mockSelectWhere
        .mockResolvedValueOnce([provisionalEntry])
        .mockReturnValueOnce({
          orderBy: vi.fn().mockReturnValue({
            limit: mockSelectLimit,
          }),
        });
      mockSelectLimit.mockResolvedValue([{ id: "salt" }]);
      mockTransaction.mockImplementation(
        async (cb: (tx: unknown) => unknown) => {
          const tx = {
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(undefined),
              }),
            }),
            execute: vi.fn().mockResolvedValue(undefined),
            delete: vi
              .fn()
              .mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
          };
          await cb(tx);
        },
      );

      const res = await POST(
        makeReq({ id: "uuid-provisional", rawText: "salt" }),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ success: true, mergedInto: "salt" });
      expect(mockTransaction).toHaveBeenCalledOnce();
      expect(mockUpdateWhere).not.toHaveBeenCalled();
    });
  });

  describe("confirm-in-place: no existing canonical", () => {
    it("returns the enriched ingredient when no canonical of the same name exists", async () => {
      mockSelectWhere
        .mockResolvedValueOnce([provisionalEntry])
        .mockReturnValueOnce({
          orderBy: vi.fn().mockReturnValue({
            limit: mockSelectLimit,
          }),
        });
      mockSelectLimit.mockResolvedValue([]);

      const res = await POST(
        makeReq({ id: "uuid-provisional", rawText: "newingredient" }),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ success: true, ingredient: enrichedIngredient });
      expect(mockTransaction).not.toHaveBeenCalled();
      expect(mockUpdateWhere).toHaveBeenCalledOnce();
    });
  });

  describe("validation", () => {
    it("returns 400 when id is missing", async () => {
      const res = await POST(makeReq({ rawText: "salt" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when rawText is missing", async () => {
      const res = await POST(makeReq({ id: "uuid-1" }));
      expect(res.status).toBe(400);
    });

    it("returns 401 when not authenticated", async () => {
      vi.mocked(requireSession).mockResolvedValue({
        response: new Response(null, { status: 401 }),
      } as never);

      const res = await POST(makeReq({ id: "uuid-1", rawText: "salt" }));

      expect(res.status).toBe(401);
    });

    it("skips enrichment when entry is already confirmed", async () => {
      mockSelectWhere.mockResolvedValueOnce([
        { retryCount: 0, status: "confirmed" },
      ]);

      const res = await POST(makeReq({ id: "uuid-1", rawText: "salt" }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ success: true });
      expect(callAiForIngredient).not.toHaveBeenCalled();
    });
  });
});
