type WorkerInput = { type: "embed"; texts: string[] };
type WorkerOutput =
  | { type: "embeddings"; data: number[][] }
  | { type: "error"; message: string };

const TIMEOUT_MS = 120_000;

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./embed-worker.ts", import.meta.url));
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
      clearTimeout(timer);
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);

      const output = event.data;
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
