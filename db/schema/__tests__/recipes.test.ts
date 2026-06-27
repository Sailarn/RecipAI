import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { recipes } from "../recipes";

describe("recipes schema", () => {
  it("defines private-by-default visibility", () => {
    const config = getTableConfig(recipes);
    const isPublicColumn = config.columns.find(
      (column) => column.name === "is_public",
    );

    expect(isPublicColumn).toBeDefined();
    expect(isPublicColumn?.notNull).toBe(true);
    expect(isPublicColumn?.default).toBe(false);
  });
});
