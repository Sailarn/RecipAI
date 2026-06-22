import { log } from "@/lib/telemetry";
import {
  type EmbedPrefix,
  type EmbedProvider,
  EmbedUnavailable,
} from "./types";

export async function runChain(
  providers: EmbedProvider[],
  texts: string[],
  prefix: EmbedPrefix,
): Promise<number[][]> {
  for (let index = 0; index < providers.length; index++) {
    const provider = providers[index];
    try {
      const vectors = await provider.embed(texts, prefix);
      log("info", "embed_provider_served", {
        provider: provider.name,
        depth: index,
        count: texts.length,
      });
      return vectors;
    } catch (caughtError) {
      log("warn", "embed_provider_failed", {
        provider: provider.name,
        depth: index,
        error:
          caughtError instanceof Error
            ? caughtError.message
            : String(caughtError),
      });
    }
  }
  throw new EmbedUnavailable();
}
