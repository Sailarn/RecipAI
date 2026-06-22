import {
  env,
  type FeatureExtractionPipeline,
  pipeline,
} from "@huggingface/transformers";
import type { EmbedPrefix, EmbedProvider } from "./types";

// Cache the model outside node_modules when EMBED_MODEL_CACHE_DIR is set, so a
// deploy's `bun install` (which rebuilds node_modules) doesn't wipe it and force
// a ~50s re-download on the next cold load. Defaults to the package's in-package
// cache when unset.
if (process.env.EMBED_MODEL_CACHE_DIR) {
  env.cacheDir = process.env.EMBED_MODEL_CACHE_DIR;
}

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
