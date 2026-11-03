"use client";

import { useCallback, useEffect, useState } from "react";
import type { AiAppId } from "@/lib/ai-apps";
import { api } from "@/lib/routes";

export interface AiConnectionSummary {
  clientId: string;
  name: string;
  app: AiAppId | null;
  connectedAt: string;
  lastActiveAt: string;
}

export type AiConnectionsStatus = "idle" | "loading" | "ready" | "error";

// One fetch shared by every mounted consumer (recipe detail, profile) and
// reused for a short while, so moving between recipes doesn't refetch.
const FRESH_MS = 60_000;
let cached: { at: number; connections: AiConnectionSummary[] } | null = null;
let inFlight: Promise<AiConnectionSummary[]> | null = null;
const listeners = new Set<(connections: AiConnectionSummary[]) => void>();

async function fetchConnections(): Promise<AiConnectionSummary[]> {
  const response = await fetch(api.mcpConnections, { credentials: "include" });
  if (!response.ok) throw new Error(`connections ${response.status}`);
  const body = (await response.json()) as {
    connections: AiConnectionSummary[];
  };
  return body.connections;
}

function loadConnections(force = false): Promise<AiConnectionSummary[]> {
  if (!force && cached && Date.now() - cached.at < FRESH_MS) {
    return Promise.resolve(cached.connections);
  }
  inFlight ??= fetchConnections()
    .then((connections) => {
      cached = { at: Date.now(), connections };
      for (const listener of listeners) listener(connections);
      return connections;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Test seam: forget the shared cache. */
export function resetAiConnectionsCache(): void {
  cached = null;
  inFlight = null;
}

/**
 * The signed-in user's connected AI apps. Refetches when the page becomes
 * visible again, so returning from Claude after connecting updates the state.
 * Pass `enabled: false` when signed out (the endpoint needs a session).
 */
export function useAiConnections(enabled: boolean) {
  const [connections, setConnections] = useState<AiConnectionSummary[]>(
    cached?.connections ?? [],
  );
  const [status, setStatus] = useState<AiConnectionsStatus>(
    cached ? "ready" : "idle",
  );

  const refresh = useCallback(
    (force = false) => {
      if (!enabled) return;
      setStatus((current) => (current === "ready" ? current : "loading"));
      loadConnections(force)
        .then((next) => {
          setConnections(next);
          setStatus("ready");
        })
        .catch(() => setStatus("error"));
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) return;
    listeners.add(setConnections);
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      listeners.delete(setConnections);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, refresh]);

  const disconnect = useCallback(async (clientIds: string[]) => {
    const response = await fetch(api.mcpConnections, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientIds }),
    });
    if (!response.ok) throw new Error(`disconnect ${response.status}`);
    await loadConnections(true).then(setConnections);
  }, []);

  const connectedApps = new Set(
    connections.flatMap((connection) =>
      connection.app ? [connection.app] : [],
    ),
  );

  return { status, connections, connectedApps, refresh, disconnect };
}
