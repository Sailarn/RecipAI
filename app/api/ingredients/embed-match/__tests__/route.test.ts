import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EMBED_MAX_ITEMS, EMBED_MAX_TEXT_LENGTH } from "@/lib/api-limits";

vi.mock("@/lib/embed", () => ({
  embed: vi.fn(),
  EmbedUnavailable: class EmbedUnavailable extends Error {},
}));
vi.mock("@/lib/db/vocab-vector-search", () => ({ nearestVocab: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: vi.fn().mockResolvedValue(null) } },
}));
vi.mock("@/lib/rate-limit", () => ({
  enforceEmbedRateLimit: vi.fn().mockResolvedValue(null),
}));

import { nearestVocab } from "@/lib/db/vocab-vector-search";
import { EmbedUnavailable, embed } from "@/lib/embed";
import { enforceEmbedRateLimit } from "@/lib/rate-limit";
import { POST } from "../route";

function post(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ingredients/embed-match", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.mocked(enforceEmbedRateLimit).mockResolvedValue(null);
});

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

  it("embeds the en head in preference to item when supplied", async () => {
    vi.mocked(embed).mockResolvedValue([[0.1], [0.2]]);
    vi.mocked(nearestVocab).mockResolvedValue(null);

    await POST(
      post({
        items: [
          { item: "2 small zucchini", en: "zucchini" },
          { item: "latticini freschi" },
        ],
      }),
    );

    expect(embed).toHaveBeenCalledWith(
      ["zucchini", "latticini freschi"],
      "query",
    );
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

  it("400s when the item count exceeds the cap", async () => {
    const items = Array.from({ length: EMBED_MAX_ITEMS + 1 }, () => ({
      item: "garlic",
    }));

    const res = await POST(post({ items }));

    expect(res.status).toBe(400);
    expect(embed).not.toHaveBeenCalled();
  });

  it("400s when an item string exceeds the length cap", async () => {
    const res = await POST(
      post({ items: [{ item: "x".repeat(EMBED_MAX_TEXT_LENGTH + 1) }] }),
    );

    expect(res.status).toBe(400);
    expect(embed).not.toHaveBeenCalled();
  });

  it("returns the limiter response when rate limited, before any embedding", async () => {
    vi.mocked(enforceEmbedRateLimit).mockResolvedValue(
      new NextResponse(null, { status: 429 }),
    );

    const res = await POST(post({ items: [{ item: "garlic" }] }));

    expect(res.status).toBe(429);
    expect(embed).not.toHaveBeenCalled();
  });
});
