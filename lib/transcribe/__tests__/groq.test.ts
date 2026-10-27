import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GROQ_MAX_BYTES, transcribeWithGroq } from "../groq";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GROQ_API_KEY", "test-key");
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("transcribeWithGroq", () => {
  it("posts the media as a Whisper form and returns the trimmed text", async () => {
    fetchMock.mockResolvedValue(new Response("  Fry the onions.  \n"));

    const text = await transcribeWithGroq(new ArrayBuffer(8), true);

    expect(text).toBe("Fry the onions.");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers).toEqual({ Authorization: "Bearer test-key" });
    const form = init.body as FormData;
    expect(form.get("model")).toBe("whisper-large-v3");
    expect((form.get("file") as File).type).toBe("audio/mpeg");
  });

  it("sends video as mp4 by default", async () => {
    fetchMock.mockResolvedValue(new Response("text"));

    await transcribeWithGroq(new ArrayBuffer(8));

    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect((form.get("file") as File).type).toBe("video/mp4");
  });

  it("rejects media over the size cap without calling Groq", async () => {
    await expect(
      transcribeWithGroq(new ArrayBuffer(GROQ_MAX_BYTES + 1)),
    ).rejects.toThrow("too large");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails clearly when the API key is missing", async () => {
    vi.stubEnv("GROQ_API_KEY", "");

    await expect(transcribeWithGroq(new ArrayBuffer(8))).rejects.toThrow(
      "GROQ_API_KEY not configured",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("includes the status and body of a failed request", async () => {
    fetchMock.mockResolvedValue(new Response("rate limited", { status: 429 }));

    await expect(transcribeWithGroq(new ArrayBuffer(8))).rejects.toThrow(
      "Groq transcription failed: 429 — rate limited",
    );
  });
});
