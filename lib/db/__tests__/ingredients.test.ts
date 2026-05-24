import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  db: {
    ingredients: {
      add: vi.fn(),
    },
  },
}));

vi.mock("@/lib/routes", () => ({
  api: {
    ingredientsEnrich: "/api/ingredients/enrich",
  },
}));

import { db } from "../db";
import { createProvisionalIngredient } from "../ingredients";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.ingredients.add).mockResolvedValue("ignored" as never);
  fetchMock.mockResolvedValue(undefined);
});

describe("createProvisionalIngredient", () => {
  it("writes a provisional entry to db.ingredients with correct fields", async () => {
    await createProvisionalIngredient("Tajín seasoning");

    expect(db.ingredients.add).toHaveBeenCalledWith(
      expect.objectContaining({
        en: "Tajín seasoning",
        ua: null,
        category: "Other",
        aliasesEn: [],
        aliasesUa: [],
        status: "provisional",
        retryCount: 0,
        lastAttemptAt: null,
        id: expect.any(String),
      }),
    );
  });

  it("fires POST to the enrich endpoint with id and rawText", async () => {
    await createProvisionalIngredient("Tajín seasoning");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/ingredients/enrich");
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body as string) as {
      id: string;
      rawText: string;
    };
    expect(body.rawText).toBe("Tajín seasoning");
    expect(body.id).toEqual(expect.any(String));
  });

  it("returns the generated id", async () => {
    const id = await createProvisionalIngredient("Test ingredient");
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("the returned id matches what was written to Dexie", async () => {
    const id = await createProvisionalIngredient("Test ingredient");

    expect(db.ingredients.add).toHaveBeenCalledWith(
      expect.objectContaining({ id }),
    );
  });

  it("swallows enrich fetch failure — still resolves with an id", async () => {
    fetchMock.mockRejectedValue(new Error("network error"));

    await expect(createProvisionalIngredient("Anything")).resolves.toEqual(
      expect.any(String),
    );
  });

  it("propagates db.ingredients.add failure to the caller", async () => {
    vi.mocked(db.ingredients.add).mockRejectedValue(
      new Error("QuotaExceededError"),
    );

    await expect(createProvisionalIngredient("Test")).rejects.toThrow(
      "QuotaExceededError",
    );
  });
});
