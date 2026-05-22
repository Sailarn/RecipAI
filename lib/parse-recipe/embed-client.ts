import { hasEmbedConsent } from "./embed-consent";
import type { WorkerOutput } from "./embed-worker";

type WorkerInput = { type: "embed"; texts: string[] };

const TIMEOUT_MS = 120_000;

let worker: Worker | null = null;

function setupWorker(w: Worker): void {
  w.addEventListener("message", (event: MessageEvent<WorkerOutput>) => {
    const { type } = event.data;
    if (type === "progress") {
      window.dispatchEvent(
        new CustomEvent("embed-model-progress", {
          detail: { progress: event.data.progress },
        }),
      );
    } else if (type === "loaded") {
      window.dispatchEvent(new CustomEvent("embed-model-loaded"));
    }
  });
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./embed-worker.ts", import.meta.url));
    setupWorker(worker);
  }
  return worker;
}

export function preWarmEmbedWorker(): void {
  if (!hasEmbedConsent()) return;
  getIngredientEmbeddings([" "]).catch(() => {});
}

export async function getIngredientEmbeddings(
  texts: string[],
): Promise<number[][]> {
  if (!hasEmbedConsent()) throw new Error("EmbedConsentRequired");
  const w = getWorker();

  return new Promise<number[][]>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Embedding worker timed out"));
    }, TIMEOUT_MS);

    const onMessage = (event: MessageEvent<WorkerOutput>) => {
      const output = event.data;
      if (
        output.type === "loading" ||
        output.type === "loaded" ||
        output.type === "progress"
      )
        return;

      clearTimeout(timer);
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);

      if (output.type === "embeddings") {
        resolve(output.data);
      } else {
        reject(new Error(output.message));
      }
    };

    const onError = (event: ErrorEvent) => {
      clearTimeout(timer);
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      reject(new Error(event.message));
    };

    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);

    const input: WorkerInput = { type: "embed", texts };
    w.postMessage(input);
  });
}
