import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMBED_MAX_TEXT_LENGTH } from "@/lib/api-limits";

vi.mock("@/lib/embed", () => ({ embedLocalOnly: vi.fn() }));

import { embedLocalOnly } from "@/lib/embed";
import { POST } from "../route";

const SECRET = "s3cret";

function post(body: unknown, secretHeader?: string): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (secretHeader !== undefined) headers["x-embed-secret"] = secretHeader;
  return new NextRequest("http://localhost/api/embed", {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
}

beforeEach(() => {
  vi.mocked(embedLocalOnly).mockResolvedValue([[0.1, 0.2]]);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("POST /api/embed", () => {
  it("401s when no secret is configured (fail closed)", async () => {
    vi.stubEnv("EMBED_SHARED_SECRET", "");

    const res = await POST(post({ texts: ["garlic"] }, SECRET));

    expect(res.status).toBe(401);
    expect(embedLocalOnly).not.toHaveBeenCalled();
  });

  it("401s when the secret header is absent", async () => {
    vi.stubEnv("EMBED_SHARED_SECRET", SECRET);

    const res = await POST(post({ texts: ["garlic"] }));

    expect(res.status).toBe(401);
    expect(embedLocalOnly).not.toHaveBeenCalled();
  });

  it("401s when the secret header is wrong", async () => {
    vi.stubEnv("EMBED_SHARED_SECRET", SECRET);

    const res = await POST(post({ texts: ["garlic"] }, "wrong"));

    expect(res.status).toBe(401);
    expect(embedLocalOnly).not.toHaveBeenCalled();
  });

  it("embeds when the secret matches", async () => {
    vi.stubEnv("EMBED_SHARED_SECRET", SECRET);

    const res = await POST(
      post({ texts: ["garlic"], prefix: "query" }, SECRET),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ vectors: [[0.1, 0.2]] });
    expect(embedLocalOnly).toHaveBeenCalledWith(["garlic"], "query");
  });

  it("400s on an empty texts array", async () => {
    vi.stubEnv("EMBED_SHARED_SECRET", SECRET);

    const res = await POST(post({ texts: [] }, SECRET));

    expect(res.status).toBe(400);
    expect(embedLocalOnly).not.toHaveBeenCalled();
  });

  it("400s when a text exceeds the length cap", async () => {
    vi.stubEnv("EMBED_SHARED_SECRET", SECRET);

    const res = await POST(
      post({ texts: ["x".repeat(EMBED_MAX_TEXT_LENGTH + 1)] }, SECRET),
    );

    expect(res.status).toBe(400);
    expect(embedLocalOnly).not.toHaveBeenCalled();
  });
});
