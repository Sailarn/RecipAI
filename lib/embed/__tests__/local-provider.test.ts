import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmbedProvider } from "../types";

const { pipelineMock } = vi.hoisted(() => ({ pipelineMock: vi.fn() }));
vi.mock("@huggingface/transformers", () => ({
  pipeline: pipelineMock,
  env: {},
}));

async function freshLocalProvider(): Promise<EmbedProvider> {
  vi.resetModules();
  const module = await import("../local-provider");
  return module.localProvider;
}

beforeEach(() => {
  pipelineMock.mockReset();
});

describe("localProvider", () => {
  it("retries the model load after a transient failure", async () => {
    const extractor = vi
      .fn()
      .mockResolvedValue({ data: new Float32Array([0.5, 0.25]) });
    pipelineMock
      .mockRejectedValueOnce(new Error("download failed"))
      .mockResolvedValueOnce(extractor);
    const localProvider = await freshLocalProvider();

    await expect(localProvider.embed(["garlic"], "query")).rejects.toThrow(
      "download failed",
    );
    const result = await localProvider.embed(["garlic"], "query");

    expect(result).toEqual([[0.5, 0.25]]);
    expect(pipelineMock).toHaveBeenCalledTimes(2);
  });

  it("applies the prefix and loads the model only once across calls", async () => {
    const extractor = vi
      .fn()
      .mockResolvedValue({ data: new Float32Array([0.5]) });
    pipelineMock.mockResolvedValue(extractor);
    const localProvider = await freshLocalProvider();

    await localProvider.embed(["onion"], "passage");
    await localProvider.embed(["salt"], "query");

    expect(extractor).toHaveBeenNthCalledWith(1, "passage: onion", {
      pooling: "mean",
      normalize: true,
    });
    expect(extractor).toHaveBeenNthCalledWith(2, "query: salt", {
      pooling: "mean",
      normalize: true,
    });
    expect(pipelineMock).toHaveBeenCalledTimes(1);
  });
});
