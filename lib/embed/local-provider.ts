import {
  type FeatureExtractionPipeline,
  pipeline,
} from "@huggingface/transformers";
import type { EmbedPrefix, EmbedProvider } from "./types";

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline(
      "feature-extraction",
      "Xenova/multilingual-e5-small",
    ).catch((error) => {
      // Drop the rejected singleton so a later request retries the load instead
      // of being wedged by one transient first-load/download failure until the
      // process restarts. Concurrent successful loads still share one promise.
      extractorPromise = null;
      throw error;
    });
  }
  return extractorPromise;
}

export const localProvider: EmbedProvider = {
  name: "local",
  async embed(texts: string[], prefix: EmbedPrefix): Promise<number[][]> {
    const extractor = await getExtractor();
    const vectors: number[][] = [];
    for (const text of texts) {
      const output = await extractor(`${prefix}: ${text}`, {
        pooling: "mean",
        normalize: true,
      });
      vectors.push(Array.from(output.data as Float32Array));
    }
    return vectors;
  },
};
