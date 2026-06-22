import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/embed", () => ({
  embed: vi.fn(),
  EmbedUnavailable: class EmbedUnavailable extends Error {},
}));
vi.mock("@/lib/db/vocab-vector-search", () => ({ nearestVocab: vi.fn() }));

import { nearestVocab } from "@/lib/db/vocab-vector-search";
import { EmbedUnavailable, embed } from "@/lib/embed";
import { POST } from "../route";

function post(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ingredients/embed-match", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => vi.clearAllMocks());

describe("POST /api/ingredients/embed-match", () => {
  it("returns the matched id per item", async () => {
    vi.mocked(embed).mockResolvedValue([[0.1], [0.2]]);
    vi.mocked(nearestVocab)
      .mockResolvedValueOnce("garlic")
      .mockResolvedValueOnce(null);

    const res = await POST(
      post({ items: [{ item: "garlic" }, { item: "zzz" }] }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ matches: ["garlic", null], degraded: false });
  });

  it("degrades to all-null (200) when no host is reachable", async () => {
    vi.mocked(embed).mockRejectedValue(new EmbedUnavailable());

    const res = await POST(post({ items: [{ item: "garlic" }] }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ matches: [null], degraded: true });
  });

  it("400s on an empty items array", async () => {
    const res = await POST(post({ items: [] }));

    expect(res.status).toBe(400);
  });
});
