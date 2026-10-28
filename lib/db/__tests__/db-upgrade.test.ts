import Dexie from "dexie";
import { describe, expect, it } from "vitest";

// Seeds a device still on schema v11, then opens the current schema over it,
// the way an installed PWA meets a new release.
async function seedVersion11(pantry: Record<string, unknown>[]) {
  const legacy = new Dexie("RecipeAppDB");
  legacy.version(11).stores({
    recipes: "id, title, createdAt, updatedAt, status",
    parsedRecipes: "id, createdAt",
    collections: "id, name, createdAt",
    notifications: "id, entityId, entityType, type, createdAt",
    ingredients: "id, category",
    pantry: "id, ingredientId",
    parseHistory: "id, createdAt, status",
  });
  await legacy.table("pantry").bulkPut(pantry);
  await legacy.table("recipes").put({ id: "recipe-1", title: "Kept" });
  legacy.close();
}

describe("Dexie upgrade to v12", () => {
  it("collapses duplicate pantry rows per ingredient and keeps everything else", async () => {
    await seedVersion11([
      { id: "p1", ingredientId: "salt", name: "Salt" },
      { id: "p2", ingredientId: "salt", name: "Salt again" },
      { id: "p3", ingredientId: "flour", name: "Flour" },
      { id: "p4", name: "Free text, no ingredient" },
      { id: "p5", name: "Another free text" },
    ]);

    const { db } = await import("../db");
    const pantryIds = (await db.pantry.toArray()).map((row) => row.id).sort();

    expect(db.verno).toBe(14);
    expect(pantryIds).toEqual(["p1", "p3", "p4", "p5"]);
    expect(await db.recipes.get("recipe-1")).toMatchObject({ title: "Kept" });
    expect(await db.parseNotifications.count()).toBe(0);
    expect(db.tables.map((table) => table.name)).not.toContain("notifications");
    db.close();
  });
});
