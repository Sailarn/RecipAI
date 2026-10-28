import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureError } from "@/lib/telemetry";
import {
  normalizePulledRecipes,
  runStartupMigrations,
} from "../startup-migrations";

const migrations = vi.hoisted(() => ({
  renormalizeOutdatedRecipes: vi.fn(),
  migrateLegacyRecipeShapes: vi.fn(),
  reconcileVocab: vi.fn(),
  normalizePendingRecipes: vi.fn(),
}));

vi.mock("@/lib/db/renormalize-recipes", () => ({
  renormalizeOutdatedRecipes: migrations.renormalizeOutdatedRecipes,
}));
vi.mock("@/lib/db/migrate-recipe-shape", () => ({
  migrateLegacyRecipeShapes: migrations.migrateLegacyRecipeShapes,
}));
vi.mock("@/lib/db/reconcile-vocab", () => ({
  reconcileVocab: migrations.reconcileVocab,
}));
vi.mock("@/lib/db/normalize-pending-recipes", () => ({
  normalizePendingRecipes: migrations.normalizePendingRecipes,
}));

describe("runStartupMigrations", () => {
  beforeEach(() => {
    migrations.renormalizeOutdatedRecipes.mockResolvedValue(undefined);
    migrations.migrateLegacyRecipeShapes.mockResolvedValue(undefined);
    migrations.reconcileVocab.mockResolvedValue(undefined);
  });

  it("runs every migration", async () => {
    runStartupMigrations();

    await vi.waitFor(() => {
      expect(migrations.renormalizeOutdatedRecipes).toHaveBeenCalledOnce();
      expect(migrations.migrateLegacyRecipeShapes).toHaveBeenCalledOnce();
      expect(migrations.reconcileVocab).toHaveBeenCalledOnce();
    });
    expect(captureError).not.toHaveBeenCalled();
  });

  it("reports a failed migration with its source tag and still runs the rest", async () => {
    const failure = new Error("dexie closed");
    migrations.reconcileVocab.mockRejectedValue(failure);

    runStartupMigrations();

    await vi.waitFor(() =>
      expect(captureError).toHaveBeenCalledWith(failure, {
        tags: { source: "startup-migration:reconcile-vocab" },
      }),
    );
    expect(migrations.renormalizeOutdatedRecipes).toHaveBeenCalledOnce();
    expect(migrations.migrateLegacyRecipeShapes).toHaveBeenCalledOnce();
  });
});

describe("normalizePulledRecipes", () => {
  it("reports a failure under its own source tag", async () => {
    const failure = new Error("embed down");
    migrations.normalizePendingRecipes.mockRejectedValue(failure);

    normalizePulledRecipes();

    await vi.waitFor(() =>
      expect(captureError).toHaveBeenCalledWith(failure, {
        tags: { source: "startup-migration:normalize-pending-recipes" },
      }),
    );
  });
});
