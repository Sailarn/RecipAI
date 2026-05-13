import "./test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db";
import {
  clearSyncNotifications,
  getAllNotifications,
  getSyncNotificationCount,
  replaceSyncNotifications,
  resolveNotification,
} from "../notifications";
import type { SyncNotification } from "../schema";

type NotificationInput = Omit<SyncNotification, "id" | "createdAt">;

const serverOnlyRecipe: NotificationInput = {
  entityId: "recipe-1",
  entityType: "recipe",
  type: "server_only",
  serverSnapshot: JSON.stringify({ id: "recipe-1", title: "Pasta" }),
  localSnapshot: null,
};

const localOnlyCollection: NotificationInput = {
  entityId: "col-1",
  entityType: "collection",
  type: "local_only",
  serverSnapshot: null,
  localSnapshot: JSON.stringify({ id: "col-1", name: "Faves", emoji: "⭐" }),
};

beforeEach(async () => {
  await db.notifications.clear();
});

describe("replaceSyncNotifications", () => {
  it("writes all items with generated id and createdAt", async () => {
    await replaceSyncNotifications([serverOnlyRecipe]);
    const all = await db.notifications.toArray();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBeDefined();
    expect(all[0].createdAt).toBeInstanceOf(Date);
    expect(all[0].entityId).toBe("recipe-1");
    expect(all[0].type).toBe("server_only");
  });

  it("clears previous notifications atomically before writing new ones", async () => {
    await replaceSyncNotifications([serverOnlyRecipe]);
    await replaceSyncNotifications([localOnlyCollection]);
    const all = await db.notifications.toArray();
    expect(all).toHaveLength(1);
    expect(all[0].entityType).toBe("collection");
  });

  it("handles empty array — clears all notifications", async () => {
    await replaceSyncNotifications([serverOnlyRecipe]);
    await replaceSyncNotifications([]);
    const all = await db.notifications.toArray();
    expect(all).toHaveLength(0);
  });
});

describe("getAllNotifications", () => {
  it("returns all notifications", async () => {
    await replaceSyncNotifications([serverOnlyRecipe, localOnlyCollection]);
    const all = await getAllNotifications();
    expect(all).toHaveLength(2);
  });

  it("returns empty array when table is empty", async () => {
    const all = await getAllNotifications();
    expect(all).toEqual([]);
  });
});

describe("resolveNotification", () => {
  it("removes the notification with the given id", async () => {
    await replaceSyncNotifications([serverOnlyRecipe, localOnlyCollection]);
    const all = await getAllNotifications();
    const target = all[0];
    await resolveNotification(target.id);
    const remaining = await getAllNotifications();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).not.toBe(target.id);
  });
});

describe("clearSyncNotifications", () => {
  it("removes all notifications", async () => {
    await replaceSyncNotifications([serverOnlyRecipe, localOnlyCollection]);
    await clearSyncNotifications();
    const all = await getAllNotifications();
    expect(all).toHaveLength(0);
  });
});

describe("getSyncNotificationCount", () => {
  it("returns 0 when empty", async () => {
    expect(await getSyncNotificationCount()).toBe(0);
  });

  it("returns correct count", async () => {
    await replaceSyncNotifications([serverOnlyRecipe, localOnlyCollection]);
    expect(await getSyncNotificationCount()).toBe(2);
  });
});
