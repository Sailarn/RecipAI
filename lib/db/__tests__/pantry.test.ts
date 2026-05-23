import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  db: {
    pantry: {
      add: vi.fn(),
      toArray: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      clear: vi.fn(),
      bulkPut: vi.fn(),
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
  setPantryQty,
  togglePantryItem,
} from "../pantry";

beforeEach(() => vi.clearAllMocks());

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
  it("adds item with generated id and addedAt, returns the id", async () => {
    vi.mocked(db.pantry.add).mockResolvedValue("generated-id" as never);

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
        id: expect.any(String),
        addedAt: expect.any(Date),
      }),
    );
    expect(id).toBe("generated-id");
  });

  it("includes ingredientId when provided", async () => {
    vi.mocked(db.pantry.add).mockResolvedValue("id-2" as never);

    await addPantryItem({
      name: "Milk",
      qty: 1,
      unit: "l",
      cat: "Dairy",
      on: true,
      ingredientId: "vocab-123",
    });

    expect(db.pantry.add).toHaveBeenCalledWith(
      expect.objectContaining({ ingredientId: "vocab-123" }),
    );
  });
});

describe("removePantryItem", () => {
  it("deletes the item by id from dexie", async () => {
    vi.mocked(db.pantry.delete).mockResolvedValue(undefined);

    await removePantryItem("item-1");

    expect(db.pantry.delete).toHaveBeenCalledWith("item-1");
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
});

describe("setPantryQty", () => {
  it("updates qty and unit for the item", async () => {
    vi.mocked(db.pantry.update).mockResolvedValue(1 as never);

    await setPantryQty("item-1", 500, "g");

    expect(db.pantry.update).toHaveBeenCalledWith("item-1", {
      qty: 500,
      unit: "g",
    });
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
