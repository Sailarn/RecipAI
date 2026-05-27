"use client";

import { toast } from "sonner";
import { db } from "@/lib/db/db";
import {
  clearSyncNotifications,
  resolveNotification,
} from "@/lib/db/notifications";
import type {
  Collection,
  Recipe,
  SyncEntityType,
  SyncNotification,
} from "@/lib/db/schema";
import { api, routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

// Snapshot parsers — convert ISO date strings from JSON back to Date objects.

function parseRecipeSnapshot(json: string): Recipe {
  const raw = JSON.parse(json);
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

function parseCollectionSnapshot(json: string): Collection {
  const raw = JSON.parse(json);
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

function pluralItems(count: number): string {
  return `${count} item${count !== 1 ? "s" : ""}`;
}

// Entity dispatch helpers — single if/else per concern instead of one per action.

function putSnapshotToStore(
  entityType: SyncEntityType,
  json: string,
): Promise<unknown> {
  if (entityType === "recipe") return db.recipes.put(parseRecipeSnapshot(json));
  return db.collections.put(parseCollectionSnapshot(json));
}

function deleteFromStore(
  entityType: SyncEntityType,
  id: string,
): Promise<void> {
  if (entityType === "recipe") return db.recipes.delete(id);
  return db.collections.delete(id);
}

function getDeleteEndpoint(entityType: SyncEntityType, id: string): string {
  return entityType === "recipe" ? api.recipe(id) : api.collection(id);
}

function getSyncEndpoint(entityType: SyncEntityType): string {
  return entityType === "recipe" ? api.recipesSync : api.collectionsSync;
}

function getSyncBodyKey(entityType: SyncEntityType): "recipes" | "collections" {
  return entityType === "recipe" ? "recipes" : "collections";
}

export function useSyncActions(locale: string) {
  const navigate = useNavigate();

  async function addToDevice(notif: SyncNotification): Promise<void> {
    if (!notif.serverSnapshot) return;
    await putSnapshotToStore(notif.entityType, notif.serverSnapshot);
    await resolveNotification(notif.id);
  }

  async function deleteFromServer(notif: SyncNotification): Promise<void> {
    const endpoint = getDeleteEndpoint(notif.entityType, notif.entityId);
    const res = await fetch(endpoint, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete from server — check your connection");
      return;
    }
    await resolveNotification(notif.id);
  }

  async function uploadToServer(notif: SyncNotification): Promise<void> {
    if (!notif.localSnapshot) return;
    const item = JSON.parse(notif.localSnapshot);
    const endpoint = getSyncEndpoint(notif.entityType);
    const bodyKey = getSyncBodyKey(notif.entityType);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [bodyKey]: [item] }),
    });
    if (!res.ok) {
      toast.error("Upload failed — check your connection");
      return;
    }
    await resolveNotification(notif.id);
  }

  async function deleteFromDevice(notif: SyncNotification): Promise<void> {
    await deleteFromStore(notif.entityType, notif.entityId);
    await resolveNotification(notif.id);
  }

  // takeServerVersion is identical to addToDevice — use addToDevice directly.

  async function keepMine(notif: SyncNotification): Promise<void> {
    if (!notif.localSnapshot) return;
    const item = JSON.parse(notif.localSnapshot);
    const endpoint = getDeleteEndpoint(notif.entityType, notif.entityId);
    // Collections only allow name and emoji to be patched; recipes send the full item.
    const body =
      notif.entityType === "recipe"
        ? item
        : { name: item.name, emoji: item.emoji };
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error("Failed to push your version — check your connection");
      return;
    }
    await resolveNotification(notif.id);
  }

  async function addAll(notifications: SyncNotification[]): Promise<void> {
    for (const notification of notifications) {
      await addToDevice(notification);
    }
    toast.success(`${pluralItems(notifications.length)} added to device`);
  }

  async function uploadAll(notifications: SyncNotification[]): Promise<void> {
    let failed = 0;
    for (const notification of notifications) {
      if (!notification.localSnapshot) {
        failed++;
        continue;
      }
      const item = JSON.parse(notification.localSnapshot);
      const endpoint = getSyncEndpoint(notification.entityType);
      const bodyKey = getSyncBodyKey(notification.entityType);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [bodyKey]: [item] }),
      });
      if (res.ok) {
        await resolveNotification(notification.id);
      } else {
        failed++;
      }
    }
    const uploaded = notifications.length - failed;
    if (failed > 0) {
      toast.error(`${pluralItems(failed)} failed to upload`);
    } else {
      toast.success(`${pluralItems(uploaded)} uploaded`);
    }
  }

  async function dismissAll(): Promise<void> {
    await clearSyncNotifications();
    toast.success("Sync review cleared");
    navigate.replace(routes.profile(locale));
  }

  return {
    addToDevice,
    deleteFromServer,
    uploadToServer,
    deleteFromDevice,
    keepMine,
    addAll,
    uploadAll,
    dismissAll,
  };
}
