import { log } from "@/lib/telemetry";
import {
  EMBED_DIMENSIONS,
  type EmbedPrefix,
  type EmbedProvider,
  EmbedUnavailable,
} from "./types";

// A provider only counts as successful when it returns exactly one finite
// EMBED_DIMENSIONS vector per input. Wrong count, wrong width, non-finite
// values, or a non-array are treated as provider failure so the chain falls
// back instead of returning garbage or matches misaligned with their inputs.
function isValidVectorBatch(
  vectors: unknown,
  expectedCount: number,
): vectors is number[][] {
  return (
    Array.isArray(vectors) &&
    vectors.length === expectedCount &&
    vectors.every(
      (vector) =>
        Array.isArray(vector) &&
        vector.length === EMBED_DIMENSIONS &&
        vector.every((component) => Number.isFinite(component)),
    )
  );
}

export async function runChain(
  providers: EmbedProvider[],
  texts: string[],
  prefix: EmbedPrefix,
): Promise<number[][]> {
  for (let index = 0; index < providers.length; index++) {
    const provider = providers[index];
    const startedAt = Date.now();
    try {
      const vectors = await provider.embed(texts, prefix);
      if (!isValidVectorBatch(vectors, texts.length)) {
        throw new Error(
          `provider ${provider.name} returned an invalid vector batch`,
        );
      }
      log("info", "embed_provider_served", {
        provider: provider.name,
        depth: index,
        count: texts.length,
        ms: Date.now() - startedAt,
      });
      return vectors;
    } catch (caughtError) {
      log("warn", "embed_provider_failed", {
        provider: provider.name,
        depth: index,
        ms: Date.now() - startedAt,
        error:
          caughtError instanceof Error
            ? caughtError.message
            : String(caughtError),
      });
    }
  }
  throw new EmbedUnavailable();
}
