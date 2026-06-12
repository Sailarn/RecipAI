import { Axiom } from "@axiomhq/js";

let client: Axiom | null = null;

function getClient(): Axiom | null {
  const token = process.env.AXIOM_TOKEN;
  if (!token) return null;
  if (!client) client = new Axiom({ token });
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
