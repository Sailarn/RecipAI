import { afterEach, describe, expect, it, vi } from "vitest";
import { makeHttpProvider } from "../http-provider";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("makeHttpProvider", () => {
  it("posts texts and returns the vectors", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ vectors: [[1, 2, 3]] }), { status: 200 }),
      );

    const provider = makeHttpProvider("https://pi.example", "s3cret");
    const result = await provider.embed(["garlic"], "query");

    expect(result).toEqual([[1, 2, 3]]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://pi.example/api/embed");
    expect((init?.headers as Record<string, string>)["x-embed-secret"]).toBe(
      "s3cret",
    );
  });

  it("throws on a non-OK response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 503 }),
    );

    const provider = makeHttpProvider("https://pi.example", "s3cret");

    await expect(provider.embed(["x"], "query")).rejects.toThrow();
  });

  it("aborts and throws when the host exceeds the timeout", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          (init as RequestInit).signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );

    const provider = makeHttpProvider("https://pi.example", "s3cret");
    const pending = provider.embed(["x"], "query");
    const assertion = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(10_000);

    await assertion;
  });
});
