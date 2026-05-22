import { toast } from "sonner";
import type { WorkerOutput } from "./embed-worker";

type WorkerInput = { type: "embed"; texts: string[] };

const TIMEOUT_MS = 120_000;

let worker: Worker | null = null;
let loadingToastId: string | number | null = null;

function setupWorker(w: Worker): void {
  w.addEventListener("message", (event: MessageEvent<WorkerOutput>) => {
    if (event.data.type === "loading") {
      loadingToastId = toast.loading(
        "Downloading AI model for ingredient matching…",
        { duration: Number.POSITIVE_INFINITY },
      );
    } else if (event.data.type === "loaded") {
      if (loadingToastId !== null) {
        toast.dismiss(loadingToastId);
        loadingToastId = null;
      }
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

export async function getIngredientEmbeddings(
  texts: string[],
): Promise<number[][]> {
  const w = getWorker();

  return new Promise<number[][]>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Embedding worker timed out"));
    }, TIMEOUT_MS);

    const onMessage = (event: MessageEvent<WorkerOutput>) => {
      const output = event.data;
      if (output.type === "loading" || output.type === "loaded") return;

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
