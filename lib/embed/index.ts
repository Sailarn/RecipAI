import { runChain } from "./chain";
import { makeHttpProvider } from "./http-provider";
import type { EmbedPrefix, EmbedProvider } from "./types";

export type { EmbedPrefix } from "./types";
export { EmbedUnavailable } from "./types";

/**
 * A lazy proxy for the local provider. The real `localProvider` (and with it
 * `@huggingface/transformers` and its onnxruntime native bindings) is imported
 * only on the first `embed()` call, not at module load time.
 *
 * This keeps the route-level `import "@/lib/embed"` free of heavy native
 * bindings on Vercel (where no GPU/model is present) and prevents onnxruntime
 * from being pulled in during unit tests that only inspect provider names.
 */
const lazyLocalProvider: EmbedProvider = {
  name: "local",
  async embed(texts: string[], prefix: EmbedPrefix): Promise<number[][]> {
    const { localProvider } = await import("./local-provider");
    return localProvider.embed(texts, prefix);
  },
};

export function parseProviders(
  config: string,
  secret: string,
): EmbedProvider[] {
  return config
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (entry === "local") {
        return lazyLocalProvider;
      }
      if (entry.startsWith("http:")) {
        return makeHttpProvider(entry.slice("http:".length), secret);
      }
      throw new Error(`Unknown embed provider: ${entry}`);
    });
}

function configuredProviders(): EmbedProvider[] {
  return parseProviders(
    process.env.EMBED_PROVIDERS ?? "",
    process.env.EMBED_SHARED_SECRET ?? "",
  );
}

/**
 * Embed via the configured host chain. Throws `EmbedUnavailable` when no host
 * is reachable.
 */
export function embed(
  texts: string[],
  prefix: EmbedPrefix,
): Promise<number[][]> {
  return runChain(configuredProviders(), texts, prefix);
}

/**
 * Embed with ONLY the local provider. Used by the raw `/api/embed` route so a
 * Vercel-hosted endpoint can never loop back to the Pi.
 */
export async function embedLocalOnly(
  texts: string[],
  prefix: EmbedPrefix,
): Promise<number[][]> {
  const { localProvider } = await import("./local-provider");
  return localProvider.embed(texts, prefix);
}
