import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetSession, mockRateLimit, mockRunJob, mockCallPhoto } = vi.hoisted(
  () => ({
    mockGetSession: vi.fn(),
    mockRateLimit: vi.fn(),
    mockRunJob: vi.fn(),
    mockCallPhoto: vi.fn(),
  }),
);

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));
vi.mock("@/lib/rate-limit", () => ({ enforceParseRateLimit: mockRateLimit }));
vi.mock("@/lib/parse-recipe/direct-parse-job", () => ({
  runDirectParseJob: mockRunJob,
}));
vi.mock("@/lib/ai", () => ({ callAiForRecipePhoto: mockCallPhoto }));
vi.mock("@/lib/parse-recipe/prompts", () => ({
  buildPhotoPrompt: () => "photo prompt",
}));

import { POST } from "../route";

function photoRequest(body: unknown) {
  return new Request("http://localhost/api/parse-recipe/photo", {
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

describe("POST /api/parse-recipe/photo", () => {
  describe("rejections", () => {
    it("returns the rate-limit response", async () => {
      const limited = new Response(null, { status: 429 });
      mockRateLimit.mockResolvedValue(limited);

      expect(await POST(photoRequest({}))).toBe(limited);
    });

    it("rejects malformed JSON", async () => {
      expect((await POST(photoRequest("{"))).status).toBe(400);
    });

    it("rejects a missing image or mime type", async () => {
      expect((await POST(photoRequest({ imageBase64: "AA" }))).status).toBe(
        400,
      );
    });

    it("rejects a non-image mime type before calling the model", async () => {
      const response = await POST(
        photoRequest({ imageBase64: "AA", mimeType: "application/pdf" }),
      );

      expect(response.status).toBe(400);
      expect(mockRunJob).not.toHaveBeenCalled();
    });
  });

  describe("accepted photo", () => {
    it("runs a photo job for the user with the client's job id", async () => {
      await POST(
        photoRequest({
          imageBase64: "AA",
          mimeType: "image/jpeg",
          jobId: "j1",
        }),
      );

      const [, job] = mockRunJob.mock.calls[0];
      expect(job).toMatchObject({
        jobId: "j1",
        userId: "user-1",
        source: "photo",
      });

      await job.extract();
      expect(mockCallPhoto).toHaveBeenCalledWith(
        "AA",
        "image/jpeg",
        "photo prompt",
      );
    });

    it("runs anonymously with a generated job id", async () => {
      mockGetSession.mockResolvedValue(null);

      await POST(photoRequest({ imageBase64: "AA", mimeType: "image/png" }));

      const [, job] = mockRunJob.mock.calls[0];
      expect(job.userId).toBeNull();
      expect(job.jobId).toMatch(/^[0-9a-f-]{36}$/);
    });
  });
});
