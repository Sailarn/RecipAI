import { Axiom } from "@axiomhq/js";
import { logger } from "@/lib/logger";
import { serverTelemetryEnabled } from "./environment";

let client: Axiom | null = null;

function getClient(): Axiom | null {
  const token = process.env.AXIOM_TOKEN;
  if (!token || !serverTelemetryEnabled()) return null;
  if (!client) {
    // The SDK swallows background flush failures unless onError is set —
    // surface them so a bad token or dataset isn't silently dropped.
    client = new Axiom({
      token,
      onError: (error) => logger.error("[axiom] ingest failed", error),
    });
  }
  return client;
}

export function sendLog(
  level: "info" | "warn" | "error",
  message: string,
  fields?: Record<string, unknown>,
): void {
  const axiom = getClient();
  if (!axiom) return;
  const dataset = process.env.AXIOM_DATASET ?? "recipai";
  axiom.ingest(dataset, [{ level, message, ...fields }]);
  // Flush per-call on Vercel only (frozen functions); Pi process batches naturally.
  if (process.env.VERCEL) axiom.flush().catch(() => {});
}
