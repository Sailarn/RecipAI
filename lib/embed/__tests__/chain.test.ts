import { describe, expect, it, vi } from "vitest";
import { runChain } from "../chain";
import {
  EMBED_DIMENSIONS,
  type EmbedProvider,
  EmbedUnavailable,
} from "../types";

function fakeProvider(
  name: string,
  impl: EmbedProvider["embed"],
): EmbedProvider {
  return { name, embed: impl };
}

function vec(fill: number): number[] {
  return Array.from({ length: EMBED_DIMENSIONS }, () => fill);
}

describe("runChain", () => {
  it("returns the first provider's vectors when it succeeds", async () => {
    const primary = fakeProvider("a", vi.fn().mockResolvedValue([vec(1)]));
    const secondary = fakeProvider("b", vi.fn().mockResolvedValue([vec(9)]));

    const result = await runChain([primary, secondary], ["garlic"], "query");

    expect(result).toEqual([vec(1)]);
    expect(secondary.embed).not.toHaveBeenCalled();
  });

  it("falls back to the next provider when the first throws", async () => {
    const primary = fakeProvider(
      "a",
      vi.fn().mockRejectedValue(new Error("down")),
    );
    const secondary = fakeProvider("b", vi.fn().mockResolvedValue([vec(7)]));

    const result = await runChain([primary, secondary], ["x"], "query");

    expect(result).toEqual([vec(7)]);
  });

  it("falls back when a provider returns the wrong vector count", async () => {
    const primary = fakeProvider("a", vi.fn().mockResolvedValue([vec(1)]));
    const secondary = fakeProvider(
      "b",
      vi.fn().mockResolvedValue([vec(2), vec(3)]),
    );

    const result = await runChain([primary, secondary], ["a", "b"], "query");

    expect(result).toEqual([vec(2), vec(3)]);
  });

  it("falls back when a vector has a non-finite component", async () => {
    const corrupt = vec(1);
    corrupt[0] = Number.NaN;
    const primary = fakeProvider("a", vi.fn().mockResolvedValue([corrupt]));
    const secondary = fakeProvider("b", vi.fn().mockResolvedValue([vec(5)]));

    const result = await runChain([primary, secondary], ["x"], "query");

    expect(result).toEqual([vec(5)]);
  });

  it("falls back when a vector has the wrong dimensions", async () => {
    const primary = fakeProvider("a", vi.fn().mockResolvedValue([[1, 2, 3]]));
    const secondary = fakeProvider("b", vi.fn().mockResolvedValue([vec(5)]));

    const result = await runChain([primary, secondary], ["x"], "query");

    expect(result).toEqual([vec(5)]);
  });

  it("throws EmbedUnavailable when every provider throws", async () => {
    const primary = fakeProvider(
      "a",
      vi.fn().mockRejectedValue(new Error("down")),
    );

    await expect(runChain([primary], ["x"], "query")).rejects.toBeInstanceOf(
      EmbedUnavailable,
    );
  });

  it("throws EmbedUnavailable when the only output is invalid", async () => {
    const primary = fakeProvider("a", vi.fn().mockResolvedValue([[1, 2]]));

    await expect(runChain([primary], ["x"], "query")).rejects.toBeInstanceOf(
      EmbedUnavailable,
    );
  });

  it("throws EmbedUnavailable when there are no providers", async () => {
    await expect(runChain([], ["x"], "query")).rejects.toBeInstanceOf(
      EmbedUnavailable,
    );
  });
});
