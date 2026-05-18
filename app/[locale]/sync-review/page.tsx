"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { db } from "@/lib/db/db";
import {
  clearSyncNotifications,
  getAllNotifications,
  resolveNotification,
} from "@/lib/db/notifications";
import type { Collection, Recipe, SyncNotification } from "@/lib/db/schema";
import { api, routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

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

function getDisplayName(notif: SyncNotification): string {
  const snapshot = notif.serverSnapshot ?? notif.localSnapshot;
  if (!snapshot) return notif.entityId;
  const parsed = JSON.parse(snapshot);
  if (notif.entityType === "recipe") return parsed.title ?? notif.entityId;
  return `${parsed.emoji ?? ""} ${parsed.name ?? notif.entityId}`.trim();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

function ActionButton({
  label,
  onClick,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger" | "ghost";
}) {
  const styles: Record<string, React.CSSProperties> = {
    default: {
      background: "rgba(59,130,246,0.85)",
      color: "#fff",
      border: "none",
    },
    danger: {
      background: "rgba(239,68,68,0.12)",
      color: "#ef4444",
      border: "1px solid rgba(239,68,68,0.25)",
    },
    ghost: {
      background: "rgba(255,255,255,0.05)",
      color: "var(--fg-2)",
      border: "1px solid rgba(255,200,100,0.12)",
    },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        ...styles[variant],
      }}
    >
      {label}
    </button>
  );
}

function ItemCard({
  notif,
  children,
}: {
  notif: SyncNotification;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "rgba(255,170,50,0.06)",
        border: "1px solid rgba(255,200,100,0.14)",
        borderRadius: 16,
        padding: "12px 14px",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 4,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14, color: "var(--fg-1)" }}>
          {getDisplayName(notif)}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--fg-3)",
            background: "rgba(255,200,100,0.1)",
            borderRadius: 99,
            padding: "2px 8px",
          }}
        >
          {notif.entityType}
        </span>
      </div>
      {children}
    </div>
  );
}

function SectionHeader({
  title,
  count,
  action,
}: {
  title: string;
  count: number;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
        marginTop: 20,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--fg-3)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {title} ({count})
      </span>
      {action}
    </div>
  );
}

export default function SyncReviewPage() {
  const navigate = useNavigate();
  const params = useParams();
  const locale = (params.locale as string) ?? "en";
  const notifications = useLiveQuery(() => getAllNotifications()) as
    | SyncNotification[]
    | undefined;

  const serverOnly = (notifications ?? []).filter(
    (n) => n.type === "server_only",
  );
  const localOnly = (notifications ?? []).filter(
    (n) => n.type === "local_only",
  );
  const conflicted = (notifications ?? []).filter(
    (n) => n.type === "conflicted",
  );
  const total = (notifications ?? []).length;

  async function deleteFromServer(notif: SyncNotification) {
    const endpoint =
      notif.entityType === "recipe"
        ? api.recipe(notif.entityId)
        : api.collection(notif.entityId);
    const res = await fetch(endpoint, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete from server — check your connection");
      return;
    }
    await resolveNotification(notif.id);
  }

  async function addToDevice(notif: SyncNotification) {
    if (notif.entityType === "recipe") {
      await db.recipes.put(parseRecipeSnapshot(notif.serverSnapshot as string));
    } else {
      await db.collections.put(
        parseCollectionSnapshot(notif.serverSnapshot as string),
      );
    }
    await resolveNotification(notif.id);
  }

  async function uploadToServer(notif: SyncNotification) {
    const item = JSON.parse(notif.localSnapshot as string);
    const endpoint =
      notif.entityType === "recipe" ? api.recipesSync : api.collectionsSync;
    const bodyKey = notif.entityType === "recipe" ? "recipes" : "collections";
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

  async function deleteFromDevice(notif: SyncNotification) {
    if (notif.entityType === "recipe") {
      await db.recipes.delete(notif.entityId);
    } else {
      await db.collections.delete(notif.entityId);
    }
    await resolveNotification(notif.id);
  }

  async function takeServerVersion(notif: SyncNotification) {
    if (notif.entityType === "recipe") {
      await db.recipes.put(parseRecipeSnapshot(notif.serverSnapshot as string));
    } else {
      await db.collections.put(
        parseCollectionSnapshot(notif.serverSnapshot as string),
      );
    }
    await resolveNotification(notif.id);
  }

  async function keepMine(notif: SyncNotification) {
    const item = JSON.parse(notif.localSnapshot as string);
    const endpoint =
      notif.entityType === "recipe"
        ? api.recipe(notif.entityId)
        : api.collection(notif.entityId);
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

  async function addAll() {
    for (const notif of serverOnly) {
      await addToDevice(notif);
    }
    toast.success(
      `${serverOnly.length} item${serverOnly.length !== 1 ? "s" : ""} added to device`,
    );
  }

  async function uploadAll() {
    let failed = 0;
    for (const notif of localOnly) {
      const item = JSON.parse(notif.localSnapshot as string);
      const endpoint =
        notif.entityType === "recipe" ? api.recipesSync : api.collectionsSync;
      const bodyKey = notif.entityType === "recipe" ? "recipes" : "collections";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [bodyKey]: [item] }),
      });
      if (res.ok) {
        await resolveNotification(notif.id);
      } else {
        failed++;
      }
    }
    const uploaded = localOnly.length - failed;
    if (failed > 0) {
      toast.error(`${failed} item${failed !== 1 ? "s" : ""} failed to upload`);
    } else {
      toast.success(`${uploaded} item${uploaded !== 1 ? "s" : ""} uploaded`);
    }
  }

  async function dismissAll() {
    await clearSyncNotifications();
    toast.success("Sync review cleared");
    navigate.replace(routes.profile(locale));
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          paddingTop: "max(20px, calc(env(safe-area-inset-top) + 8px))",
          paddingLeft: 14,
          paddingRight: 14,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => navigate.replace(routes.profile(locale))}
              aria-label="Back"
              style={{
                background: "none",
                border: "none",
                color: "var(--fg-2)",
                cursor: "pointer",
                fontSize: 20,
                padding: 0,
                lineHeight: 1,
              }}
            >
              ←
            </button>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 800,
                color: "var(--fg-1)",
              }}
            >
              Sync Review
            </h1>
          </div>
          {total > 0 && (
            <ActionButton
              label="Dismiss all"
              onClick={dismissAll}
              variant="ghost"
            />
          )}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingLeft: 14,
          paddingRight: 14,
          paddingBottom: 110,
        }}
      >
        {total === 0 ? (
          <div
            style={{
              textAlign: "center",
              paddingTop: 80,
              color: "var(--fg-2)",
              fontSize: 15,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            Everything is in sync
          </div>
        ) : (
          <>
            {serverOnly.length > 0 && (
              <section>
                <SectionHeader
                  title="Not on this device"
                  count={serverOnly.length}
                  action={<ActionButton label="Add all" onClick={addAll} />}
                />
                {serverOnly.map((notif) => {
                  const raw = JSON.parse(notif.serverSnapshot as string);
                  return (
                    <ItemCard key={notif.id} notif={notif}>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--fg-3)",
                          marginBottom: 4,
                        }}
                      >
                        On server since {formatDate(raw.updatedAt)}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                          marginTop: 8,
                        }}
                      >
                        <ActionButton
                          label="Add to device"
                          onClick={() => addToDevice(notif)}
                        />
                        <ActionButton
                          label="Delete from server"
                          onClick={() => deleteFromServer(notif)}
                          variant="danger"
                        />
                      </div>
                    </ItemCard>
                  );
                })}
              </section>
            )}

            {localOnly.length > 0 && (
              <section>
                <SectionHeader
                  title="Not on server"
                  count={localOnly.length}
                  action={
                    <ActionButton label="Upload all" onClick={uploadAll} />
                  }
                />
                {localOnly.map((notif) => {
                  const raw = JSON.parse(notif.localSnapshot as string);
                  return (
                    <ItemCard key={notif.id} notif={notif}>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--fg-3)",
                          marginBottom: 4,
                        }}
                      >
                        On device since {formatDate(raw.updatedAt)}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                          marginTop: 8,
                        }}
                      >
                        <ActionButton
                          label="Delete from device"
                          onClick={() => deleteFromDevice(notif)}
                          variant="danger"
                        />
                        <ActionButton
                          label="Upload to server"
                          onClick={() => uploadToServer(notif)}
                        />
                      </div>
                    </ItemCard>
                  );
                })}
              </section>
            )}

            {conflicted.length > 0 && (
              <section>
                <SectionHeader title="Out of sync" count={conflicted.length} />
                {conflicted.map((notif) => {
                  const localRaw = JSON.parse(notif.localSnapshot as string);
                  const serverRaw = JSON.parse(notif.serverSnapshot as string);
                  const serverNewer =
                    new Date(serverRaw.updatedAt).getTime() >
                    new Date(localRaw.updatedAt).getTime();
                  return (
                    <ItemCard key={notif.id} notif={notif}>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--fg-3)",
                          marginBottom: 4,
                        }}
                      >
                        Device: {formatDate(localRaw.updatedAt)}
                        {serverNewer ? "" : " (newer)"}
                        {" · "}
                        Server: {formatDate(serverRaw.updatedAt)}
                        {serverNewer ? " (newer)" : ""}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                          marginTop: 8,
                        }}
                      >
                        <ActionButton
                          label="Skip"
                          onClick={() => resolveNotification(notif.id)}
                          variant="ghost"
                        />
                        <ActionButton
                          label="Keep mine"
                          onClick={() => keepMine(notif)}
                          variant="ghost"
                        />
                        <ActionButton
                          label="Take server version"
                          onClick={() => takeServerVersion(notif)}
                        />
                      </div>
                    </ItemCard>
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
