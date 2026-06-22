import { describe, expect, it, vi } from "vitest";
import { runChain } from "../chain";
import { type EmbedProvider, EmbedUnavailable } from "../types";

function fakeProvider(
  name: string,
  impl: EmbedProvider["embed"],
): EmbedProvider {
  return { name, embed: impl };
}

describe("runChain", () => {
  it("returns the first provider's vectors when it succeeds", async () => {
    const primary = fakeProvider("a", vi.fn().mockResolvedValue([[1, 2]]));
    const secondary = fakeProvider("b", vi.fn().mockResolvedValue([[9, 9]]));

    const result = await runChain([primary, secondary], ["garlic"], "query");

    expect(result).toEqual([[1, 2]]);
    expect(secondary.embed).not.toHaveBeenCalled();
  });

  it("falls back to the next provider when the first throws", async () => {
    const primary = fakeProvider(
      "a",
      vi.fn().mockRejectedValue(new Error("down")),
    );
    const secondary = fakeProvider("b", vi.fn().mockResolvedValue([[7]]));

    const result = await runChain([primary, secondary], ["x"], "query");

    expect(result).toEqual([[7]]);
  });

  it("throws EmbedUnavailable when every provider fails", async () => {
    const primary = fakeProvider(
      "a",
      vi.fn().mockRejectedValue(new Error("down")),
    );

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
