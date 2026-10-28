import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetSession, mockRateLimit, mockRunJob, mockExtract } = vi.hoisted(
  () => ({
    mockGetSession: vi.fn(),
    mockRateLimit: vi.fn(),
    mockRunJob: vi.fn(),
    mockExtract: vi.fn(),
  }),
);

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));
vi.mock("@/lib/rate-limit", () => ({
  enforceParseRateLimit: mockRateLimit,
  enforceAnonTextParseRateLimit: vi.fn(),
}));
vi.mock("@/lib/parse-recipe/direct-parse-job", () => ({
  runDirectParseJob: mockRunJob,
}));
vi.mock("@/lib/parse-recipe/text-extract", () => ({
  extractRecipeFromText: mockExtract,
}));

import { POST } from "../route";

const RECIPE_TEXT = "Pancakes: 200 g flour, 2 eggs. Mix and fry.";

function textRequest(body: unknown) {
  return new Request("http://localhost/api/parse-recipe/text", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
  mockRateLimit.mockResolvedValue(null);
  mockRunJob.mockResolvedValue(new Response("{}"));
});

describe("POST /api/parse-recipe/text", () => {
  describe("rejections", () => {
    it("returns the rate-limit response", async () => {
      const limited = new Response(null, { status: 429 });
      mockRateLimit.mockResolvedValue(limited);

      expect(await POST(textRequest({ text: RECIPE_TEXT }))).toBe(limited);
    });

    it("rejects malformed JSON", async () => {
      expect((await POST(textRequest("{"))).status).toBe(400);
    });

    it.each([
      ["missing", {}],
      ["non-string", { text: 42 }],
      ["too short once trimmed", { text: "   short   " }],
    ])("rejects %s text", async (_label, body) => {
      expect((await POST(textRequest(body))).status).toBe(400);
      expect(mockRunJob).not.toHaveBeenCalled();
    });
  });

  describe("accepted text", () => {
    it("runs a text job with the trimmed text", async () => {
      await POST(textRequest({ text: `  ${RECIPE_TEXT}  `, jobId: "j1" }));

      const [, job] = mockRunJob.mock.calls[0];
      expect(job).toMatchObject({
        jobId: "j1",
        userId: "user-1",
        source: "text",
      });
      await job.extract();
      expect(mockExtract).toHaveBeenCalledWith(RECIPE_TEXT);
    });
  });
});
