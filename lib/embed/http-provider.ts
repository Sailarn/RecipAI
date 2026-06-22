import type { EmbedPrefix, EmbedProvider } from "./types";

const TIMEOUT_MS = 10_000;

export function makeHttpProvider(
  baseUrl: string,
  secret: string,
): EmbedProvider {
  return {
    name: `http:${baseUrl}`,
    async embed(texts: string[], prefix: EmbedPrefix): Promise<number[][]> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const response = await fetch(`${baseUrl}/api/embed`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-embed-secret": secret,
          },
          body: JSON.stringify({ texts, prefix }),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`embed host ${baseUrl} returned ${response.status}`);
        }
        const data = (await response.json()) as { vectors: number[][] };
        return data.vectors;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
