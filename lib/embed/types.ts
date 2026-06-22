export type EmbedPrefix = "query" | "passage";

// e5-small output width. Must stay equal to the pgvector column width
// (VECTOR_DIMS in lib/db/pg-vector.ts); a provider returning a different width
// is rejected so a model/version mismatch can't poison matching.
export const EMBED_DIMENSIONS = 384;

export type EmbedProvider = {
  name: string;
  embed(texts: string[], prefix: EmbedPrefix): Promise<number[][]>;
};

export class EmbedUnavailable extends Error {
  constructor() {
    super("No embedding provider is reachable");
    this.name = "EmbedUnavailable";
  }
}
