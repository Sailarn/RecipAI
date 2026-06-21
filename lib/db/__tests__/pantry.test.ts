import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session-state", () => ({
  isSignedIn: vi.fn().mockReturnValue(true),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/routes", () => ({
  api: {
    pantry: "/api/pantry",
  },
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

vi.mock("../db", () => ({
  db: {
    pantry: {
      add: vi.fn(),
      put: vi.fn(),
      where: vi.fn(),
      toArray: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      clear: vi.fn(),
      bulkPut: vi.fn(),
    },
    ingredients: {
      get: vi.fn(),
    },
  },
}));

import { db } from "../db";
import {
  addPantryItem,
  bulkPutPantry,
  clearPantry,
  getPantryItems,
  removePantryItem,
  togglePantryItem,
} from "../pantry";

// Default: no existing pantry row for the looked-up ingredient.
function mockExistingPantryRow(existing: unknown) {
  const first = vi.fn().mockResolvedValue(existing);
  const equals = vi.fn().mockReturnValue({ first });
  vi.mocked(db.pantry.where).mockReturnValue({ equals } as never);
  return { first, equals };
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockResolvedValue(new Response());
  mockExistingPantryRow(undefined);
});

describe("getPantryItems", () => {
  it("returns all pantry items from dexie", async () => {
    const mockItems = [
      {
        id: "item-1",
        name: "Flour",
        qty: 1,
        unit: "kg",
        cat: "Pantry",
        on: true,
        addedAt: new Date(),
      },
    ];
    vi.mocked(db.pantry.toArray).mockResolvedValue(mockItems as never);

    const result = await getPantryItems();

    expect(db.pantry.toArray).toHaveBeenCalledOnce();
    expect(result).toEqual(mockItems);
  });
});

describe("addPantryItem", () => {
  it("defaults dormant quantity, unit, and category fields", async () => {
    vi.mocked(db.pantry.add).mockResolvedValue("ignored" as never);

    await addPantryItem({
      name: "Eggs",
      on: true,
    });

    expect(db.pantry.add).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Eggs",
        qty: 1,
        unit: "pcs",
        cat: "Other",
      }),
    );
  });

  it("adds item with generated id and addedAt to Dexie", async () => {
    vi.mocked(db.pantry.add).mockResolvedValue("ignored" as never);

    const id = await addPantryItem({
      name: "Eggs",
      qty: 12,
      unit: "pcs",
      cat: "Dairy",
      on: true,
    });

    expect(db.pantry.add).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Eggs",
        qty: 12,
        unit: "pcs",
        cat: "Dairy",
        on: true,
        id,
        addedAt: expect.any(Date),
      }),
    );
  });

  it("returns the generated id", async () => {
    vi.mocked(db.pantry.add).mockResolvedValue("ignored" as never);

    const id = await addPantryItem({
      name: "Eggs",
      qty: 12,
      unit: "pcs",
      cat: "Dairy",
      on: true,
    });

    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("fires POST to /api/pantry after writing to Dexie", async () => {
    vi.mocked(db.pantry.add).mockResolvedValue("ignored" as never);

    await addPantryItem({
      name: "Eggs",
      qty: 12,
      unit: "pcs",
      cat: "Dairy",
      on: true,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/pantry");
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body as string) as { name: string };
    expect(body.name).toBe("Eggs");
  });

  it("includes ingredientId and ingredientData in the fetch body when provided", async () => {
    vi.mocked(db.pantry.add).mockResolvedValue("ignored" as never);
    const mockIngredient = {
      id: "vocab-123",
      en: "Milk",
      ua: null,
      category: "Dairy",
      aliasesEn: [],
      aliasesUa: [],
      status: "confirmed" as const,
      retryCount: 0,
      lastAttemptAt: null,
    };
    vi.mocked(db.ingredients.get).mockResolvedValue(mockIngredient as never);

    await addPantryItem({
      name: "Milk",
      qty: 1,
      unit: "l",
      cat: "Dairy",
      on: true,
      ingredientId: "vocab-123",
    });

    const body = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as { ingredientId: string; ingredientData: { id: string } };
    expect(body.ingredientId).toBe("vocab-123");
    expect(body.ingredientData).toMatchObject({ id: "vocab-123", en: "Milk" });
  });

  it("updates the existing row in place when the ingredient is already in the pantry", async () => {
    const existing = {
      id: "existing-id",
      ingredientId: "vocab-123",
      name: "Milk",
      qty: 1,
      unit: "l",
      cat: "Dairy",
      on: false,
      addedAt: new Date("2020-01-01"),
    };
    mockExistingPantryRow(existing);

    const id = await addPantryItem({
      name: "Milk",
      qty: 3,
      unit: "l",
      cat: "Dairy",
      on: true,
      ingredientId: "vocab-123",
    });

    expect(id).toBe("existing-id");
    expect(db.pantry.add).not.toHaveBeenCalled();
    expect(db.pantry.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "existing-id",
        ingredientId: "vocab-123",
        qty: 3,
        on: true,
        addedAt: existing.addedAt,
      }),
    );
  });

  it("adds a fresh row when the ingredient is not yet in the pantry", async () => {
    mockExistingPantryRow(undefined);

    await addPantryItem({
      name: "Milk",
      qty: 1,
      unit: "l",
      cat: "Dairy",
      on: true,
      ingredientId: "vocab-999",
    });

    expect(db.pantry.add).toHaveBeenCalledOnce();
    expect(db.pantry.put).not.toHaveBeenCalled();
  });

  it("always adds a fresh row for free-text items with no ingredientId", async () => {
    await addPantryItem({
      name: "Grandma's secret spice",
      qty: 1,
      unit: "pcs",
      cat: "Other",
      on: true,
    });

    expect(db.pantry.where).not.toHaveBeenCalled();
    expect(db.pantry.add).toHaveBeenCalledOnce();
  });

  it("Dexie write succeeds even when the server fetch throws", async () => {
    vi.mocked(db.pantry.add).mockResolvedValue("ignored" as never);
    fetchMock.mockRejectedValue(new Error("network error"));

    await expect(
      addPantryItem({
        name: "Eggs",
        qty: 1,
        unit: "pcs",
        cat: "Other",
        on: true,
      }),
    ).resolves.toEqual(expect.any(String));

    expect(db.pantry.add).toHaveBeenCalledOnce();
  });
});

describe("removePantryItem", () => {
  it("deletes the item by id from dexie", async () => {
    vi.mocked(db.pantry.delete).mockResolvedValue(undefined);

    await removePantryItem("item-1");

    expect(db.pantry.delete).toHaveBeenCalledWith("item-1");
  });

  it("fires DELETE to /api/pantry after deleting from Dexie", async () => {
    vi.mocked(db.pantry.delete).mockResolvedValue(undefined);

    await removePantryItem("item-1");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/pantry");
    expect(opts.method).toBe("DELETE");
    const body = JSON.parse(opts.body as string) as { id: string };
    expect(body.id).toBe("item-1");
  });
});

describe("togglePantryItem", () => {
  it("flips on from true to false", async () => {
    vi.mocked(db.pantry.get).mockResolvedValue({
      id: "item-1",
      name: "Flour",
      qty: 1,
      unit: "kg",
      cat: "Pantry",
      on: true,
      addedAt: new Date(),
    } as never);
    vi.mocked(db.pantry.update).mockResolvedValue(1 as never);

    await togglePantryItem("item-1");

    expect(db.pantry.update).toHaveBeenCalledWith("item-1", { on: false });
  });

  it("flips on from false to true", async () => {
    vi.mocked(db.pantry.get).mockResolvedValue({
      id: "item-1",
      name: "Flour",
      qty: 1,
      unit: "kg",
      cat: "Pantry",
      on: false,
      addedAt: new Date(),
    } as never);
    vi.mocked(db.pantry.update).mockResolvedValue(1 as never);

    await togglePantryItem("item-1");

    expect(db.pantry.update).toHaveBeenCalledWith("item-1", { on: true });
  });

  it("does nothing if item not found", async () => {
    vi.mocked(db.pantry.get).mockResolvedValue(undefined);

    await togglePantryItem("missing");

    expect(db.pantry.update).not.toHaveBeenCalled();
  });

  it("fires POST with the full updated item after toggling", async () => {
    const item = {
      id: "item-1",
      name: "Flour",
      qty: 1,
      unit: "kg",
      cat: "Pantry",
      on: true,
      addedAt: new Date(),
    };
    vi.mocked(db.pantry.get).mockResolvedValue(item as never);
    vi.mocked(db.pantry.update).mockResolvedValue(1 as never);

    await togglePantryItem("item-1");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/pantry");
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body as string) as { id: string; on: boolean };
    expect(body.id).toBe("item-1");
    expect(body.on).toBe(false);
  });
});

describe("clearPantry", () => {
  it("clears the entire pantry table", async () => {
    vi.mocked(db.pantry.clear).mockResolvedValue(undefined);

    await clearPantry();

    expect(db.pantry.clear).toHaveBeenCalledOnce();
  });
});

describe("bulkPutPantry", () => {
  it("bulk puts all items into dexie", async () => {
    const items = [
      {
        id: "a",
        name: "Salt",
        qty: 1,
        unit: "pcs",
        cat: "Spices",
        on: true,
        addedAt: new Date(),
      },
      {
        id: "b",
        name: "Pepper",
        qty: 1,
        unit: "pcs",
        cat: "Spices",
        on: false,
        addedAt: new Date(),
      },
    ];
    vi.mocked(db.pantry.bulkPut).mockResolvedValue(undefined as never);

    await bulkPutPantry(items);

    expect(db.pantry.bulkPut).toHaveBeenCalledWith(items);
  });
});
