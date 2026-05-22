declare const self: DedicatedWorkerGlobalScope;

import {
  type FeatureExtractionPipeline,
  type ProgressInfo,
  pipeline,
} from "@huggingface/transformers";

type WorkerInput = { type: "embed"; texts: string[] };
export type WorkerOutput =
  | { type: "embeddings"; data: number[][] }
  | { type: "error"; message: string }
  | { type: "loading" }
  | { type: "loaded" }
  | { type: "progress"; progress: number };

let extractor: FeatureExtractionPipeline | null = null;

async function loadModel(): Promise<FeatureExtractionPipeline> {
  if (!extractor) {
    self.postMessage({ type: "loading" } satisfies WorkerOutput);
    extractor = await pipeline(
      "feature-extraction",
      "Xenova/multilingual-e5-small",
      {
        progress_callback: (data: ProgressInfo) => {
          if (data.status === "progress_total") {
            self.postMessage({
              type: "progress",
              progress: Math.round(data.progress),
            } satisfies WorkerOutput);
          }
        },
      },
    );
    self.postMessage({ type: "loaded" } satisfies WorkerOutput);
  }
  return extractor;
}

self.addEventListener("message", (event: MessageEvent<WorkerInput>) => {
  const { type, texts } = event.data;

  if (type !== "embed") return;

  void (async () => {
    try {
      const model = await loadModel();
      const embeddings: number[][] = [];

      for (const text of texts) {
        const output = await model(`query: ${text}`, {
          pooling: "mean",
          normalize: true,
        });
        embeddings.push(Array.from(output.data as Float32Array));
      }

      const message: WorkerOutput = { type: "embeddings", data: embeddings };
      self.postMessage(message);
    } catch (err) {
      const message: WorkerOutput = {
        type: "error",
        message: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(message);
    }
  })();
});
