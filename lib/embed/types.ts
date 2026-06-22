export type EmbedPrefix = "query" | "passage";

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
