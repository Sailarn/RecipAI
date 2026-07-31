import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    update: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/db/schema/parse-jobs", () => ({ parseJobs: {} }));
vi.mock("@/db/schema/recipes", () => ({ recipes: {} }));
vi.mock("@/db/schema/push-subscriptions", () => ({ pushSubscriptions: {} }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), relations: vi.fn() }));
vi.mock("@/lib/web-push", () => ({ sendPushNotification: vi.fn() }));

vi.mock("@/lib/upload/imagekit", () => ({
  uploadImageServer: vi.fn(),
}));

vi.mock("@/lib/upload/images", () => ({
  isImageKitUrl: vi.fn(),
}));

vi.mock("@/lib/parse-recipe", () => ({
  parseRecipeFromUrl: vi.fn(),
}));

vi.mock("@/lib/telegram-bot", () => ({
  sendTelegramMessage: vi.fn(),
  sendTelegramPhoto: vi.fn(),
  miniAppDeepLink: (startParam: string) =>
    `https://t.me/recipai_auth_bot/recipai?startapp=${startParam}`,
}));

import { db } from "@/db";
import { parseRecipeFromUrl } from "@/lib/parse-recipe";
import { sendTelegramMessage, sendTelegramPhoto } from "@/lib/telegram-bot";
import { captureError } from "@/lib/telemetry";
import { uploadImageServer } from "@/lib/upload/imagekit";
import { isImageKitUrl } from "@/lib/upload/images";
import { sendPushNotification } from "@/lib/web-push";
import { POST } from "../route";

const IMAGEKIT_URL = "https://ik.imagekit.io/test/recipes/recipe-123.jpg";
const CDN_URL = "https://cdninstagram.com/photo.jpg";

const baseJob = {
  id: "job-1",
  url: "https://instagram.com/reel/abc",
  userId: "user-1",
  telegramChatId: "chat-1",
  userComment: null,
  status: "pending",
  updatedAt: new Date(),
};

const baseRecipe = {
  title: "Pasta",
  description: "Tasty",
  imageUrl: CDN_URL,
  prepTime: 10,
  cookTime: 20,
  servings: 2,
  ingredients: ["pasta", "salt"],
  instructions: [{ step: 1, text: "Boil water" }],
  category: "dinner",
};

function makeRequest(body: object) {
  return new Request("http://localhost/api/parse-queue/process", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }) as unknown as NextRequest;
}

function setupDb(job: object | null) {
  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  vi.mocked(db.update).mockReturnValue(updateChain as any);

  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(job ? [job] : []),
  };
  vi.mocked(db.select).mockReturnValue(selectChain as any);

  const insertChain = { values: vi.fn().mockResolvedValue(undefined) };
  vi.mocked(db.insert).mockReturnValue(insertChain as any);

  const deleteChain = { where: vi.fn().mockResolvedValue(undefined) };
  vi.mocked(db.delete).mockReturnValue(deleteChain as any);

  return { updateChain, selectChain, insertChain, deleteChain };
}

// Lets the fire-and-forget push `.catch()` chain settle before assertions.
function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isImageKitUrl).mockImplementation((url) => url === IMAGEKIT_URL);
  vi.mocked(sendPushNotification).mockResolvedValue(undefined);
  // Default: image upload succeeds. Individual tests override to reject. Without
  // a default it resolves undefined, and the (now reported) upload catch would
  // fire a spurious capture.
  vi.mocked(uploadImageServer).mockResolvedValue({
    url: IMAGEKIT_URL,
    fileId: "file-1",
  });
});

describe("POST /api/parse-queue/process", () => {
  it("returns 400 when jobId is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 404 when job is not found", async () => {
    setupDb(null);
    const res = await POST(makeRequest({ jobId: "missing" }));
    expect(res.status).toBe(404);
  });

  it("does not re-parse a job that is already done", async () => {
    setupDb({ ...baseJob, status: "done" });

    const res = await POST(makeRequest({ jobId: "job-1" }));

    expect(res.status).toBe(200);
    expect(parseRecipeFromUrl).not.toHaveBeenCalled();
  });

  it("does not re-parse a job that is processing in-flight", async () => {
    setupDb({ ...baseJob, status: "processing", updatedAt: new Date() });

    await POST(makeRequest({ jobId: "job-1" }));

    expect(parseRecipeFromUrl).not.toHaveBeenCalled();
  });

  it("re-parses a previously failed job", async () => {
    setupDb({ ...baseJob, status: "failed", telegramChatId: null });
    vi.mocked(parseRecipeFromUrl).mockResolvedValue(baseRecipe as any);

    await POST(makeRequest({ jobId: "job-1" }));

    expect(parseRecipeFromUrl).toHaveBeenCalled();
  });

  describe("Web push notification", () => {
    it("sends a push when the job has a subscribed endpoint", async () => {
      setupDb({
        ...baseJob,
        telegramChatId: null,
        pushEndpoint: "https://web.push.apple.com/abc",
      });
      vi.mocked(parseRecipeFromUrl).mockResolvedValue(baseRecipe as any);

      await POST(makeRequest({ jobId: "job-1" }));

      expect(sendPushNotification).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ title: "Pasta" }),
      );
    });

    it("sends to every current subscription of a signed-in user (by userId)", async () => {
      const jobRow = {
        ...baseJob,
        telegramChatId: null,
        pushEndpoint: "https://web.push.apple.com/enqueue-time",
      };
      setupDb(jobRow);
      const jobSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([jobRow]),
      };
      const subsSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          {
            endpoint: "https://web.push.apple.com/device-a",
            p256dh: "a",
            auth: "a",
          },
          {
            endpoint: "https://web.push.apple.com/device-b",
            p256dh: "b",
            auth: "b",
          },
        ]),
      };
      vi.mocked(db.select)
        .mockReturnValueOnce(jobSelect as any)
        .mockReturnValueOnce(subsSelect as any);
      vi.mocked(sendPushNotification).mockResolvedValue(undefined);
      vi.mocked(parseRecipeFromUrl).mockResolvedValue(baseRecipe as any);

      await POST(makeRequest({ jobId: "job-1" }));

      expect(sendPushNotification).toHaveBeenCalledTimes(2);
    });

    it("does not send a push when the job has no endpoint", async () => {
      setupDb({ ...baseJob, telegramChatId: null });
      vi.mocked(parseRecipeFromUrl).mockResolvedValue(baseRecipe as any);

      await POST(makeRequest({ jobId: "job-1" }));

      expect(sendPushNotification).not.toHaveBeenCalled();
    });

    it("sends a failure push when parsing fails and the job has a subscribed endpoint", async () => {
      setupDb({
        ...baseJob,
        telegramChatId: null,
        pushEndpoint: "https://web.push.apple.com/abc",
      });
      vi.mocked(parseRecipeFromUrl).mockRejectedValue(
        new Error("Could not extract enough text from page"),
      );

      await POST(makeRequest({ jobId: "job-1" }));

      expect(sendPushNotification).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: "Recipe parse failed",
          body: expect.stringContaining("Couldn't read the page"),
        }),
      );
    });

    it("prunes the subscription when the push service reports it expired", async () => {
      const { deleteChain } = setupDb({
        ...baseJob,
        telegramChatId: null,
        endpoint: "https://web.push.apple.com/gone",
        pushEndpoint: "https://web.push.apple.com/gone",
      });
      vi.mocked(parseRecipeFromUrl).mockResolvedValue(baseRecipe as any);
      vi.mocked(sendPushNotification).mockRejectedValue({ statusCode: 410 });

      await POST(makeRequest({ jobId: "job-1" }));
      await flushMicrotasks();

      expect(db.delete).toHaveBeenCalled();
      expect(deleteChain.where).toHaveBeenCalled();
    });

    it("keeps the subscription when the push fails for a transient reason", async () => {
      setupDb({
        ...baseJob,
        telegramChatId: null,
        endpoint: "https://web.push.apple.com/abc",
        pushEndpoint: "https://web.push.apple.com/abc",
      });
      vi.mocked(parseRecipeFromUrl).mockResolvedValue(baseRecipe as any);
      vi.mocked(sendPushNotification).mockRejectedValue({ statusCode: 500 });

      await POST(makeRequest({ jobId: "job-1" }));
      await flushMicrotasks();

      expect(db.delete).not.toHaveBeenCalled();
      expect(captureError).not.toHaveBeenCalled();
    });

    it("captures auth/VAPID failures instead of swallowing them", async () => {
      setupDb({
        ...baseJob,
        telegramChatId: null,
        endpoint: "https://web.push.apple.com/abc",
        pushEndpoint: "https://web.push.apple.com/abc",
      });
      vi.mocked(parseRecipeFromUrl).mockResolvedValue(baseRecipe as any);
      vi.mocked(sendPushNotification).mockRejectedValue({ statusCode: 403 });

      await POST(makeRequest({ jobId: "job-1" }));
      await flushMicrotasks();

      expect(captureError).toHaveBeenCalled();
      expect(db.delete).not.toHaveBeenCalled();
    });
  });

  describe("image persistence at parse time", () => {
    it("uploads the recipe image to ImageKit and stores the stable URL in the result", async () => {
      const { updateChain } = setupDb({
        ...baseJob,
        telegramChatId: null,
        pushEndpoint: null,
      });
      vi.mocked(parseRecipeFromUrl).mockResolvedValue({
        ...baseRecipe,
        imageUrl: CDN_URL,
      } as any);
      vi.mocked(uploadImageServer).mockResolvedValue({
        url: IMAGEKIT_URL,
        fileId: "file-1",
      });

      await POST(makeRequest({ jobId: "job-1" }));

      expect(uploadImageServer).toHaveBeenCalledWith(CDN_URL);
      const doneCall = updateChain.set.mock.calls.find(
        (call) => (call[0] as { status?: string }).status === "done",
      );
      expect((doneCall?.[0] as { result?: unknown }).result).toEqual(
        expect.objectContaining({
          imageUrl: IMAGEKIT_URL,
          imageFileId: "file-1",
        }),
      );
    });
  });

  describe("empty-extraction guard", () => {
    it("marks a parse with no ingredients and no steps as failed, not done", async () => {
      const { updateChain } = setupDb({ ...baseJob, telegramChatId: null });
      vi.mocked(parseRecipeFromUrl).mockResolvedValue({
        title: "Nothing",
        ingredients: [],
        instructions: [],
      } as any);

      await POST(makeRequest({ jobId: "job-1" }));

      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed" }),
      );
      expect(updateChain.set).not.toHaveBeenCalledWith(
        expect.objectContaining({ status: "done" }),
      );
    });

    it("marks a parse with no ingredients as failed", async () => {
      const { updateChain } = setupDb({ ...baseJob, telegramChatId: null });
      vi.mocked(parseRecipeFromUrl).mockResolvedValue({
        ...baseRecipe,
        ingredients: [],
      } as any);

      await POST(makeRequest({ jobId: "job-1" }));

      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed" }),
      );
      expect(updateChain.set).not.toHaveBeenCalledWith(
        expect.objectContaining({ status: "done" }),
      );
    });

    it("marks a parse with no instructions as failed", async () => {
      const { updateChain } = setupDb({ ...baseJob, telegramChatId: null });
      vi.mocked(parseRecipeFromUrl).mockResolvedValue({
        ...baseRecipe,
        instructions: [],
      } as any);

      await POST(makeRequest({ jobId: "job-1" }));

      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed" }),
      );
      expect(updateChain.set).not.toHaveBeenCalledWith(
        expect.objectContaining({ status: "done" }),
      );
    });

    it("marks an explicit notRecipe response as failed", async () => {
      const { updateChain } = setupDb({ ...baseJob, telegramChatId: null });
      vi.mocked(parseRecipeFromUrl).mockResolvedValue({
        notRecipe: true,
      } as any);

      await POST(makeRequest({ jobId: "job-1" }));

      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed" }),
      );
      expect(updateChain.set).not.toHaveBeenCalledWith(
        expect.objectContaining({ status: "done" }),
      );
    });
  });

  describe("Telegram-triggered save — completion card", () => {
    it("sends a photo card with the saved header, stats, and deep-link button", async () => {
      setupDb(baseJob);
      vi.mocked(parseRecipeFromUrl).mockResolvedValue(baseRecipe as any);

      await POST(makeRequest({ jobId: "job-1" }));

      expect(sendTelegramPhoto).toHaveBeenCalledWith(
        "chat-1",
        expect.stringContaining(IMAGEKIT_URL),
        expect.stringContaining("✅ Saved to RecipAI"),
        expect.objectContaining({
          inline_keyboard: [
            [
              expect.objectContaining({
                text: "🍳 Open recipe",
                url: expect.stringContaining("startapp=recipe_"),
              }),
            ],
          ],
        }),
      );
      const caption = vi.mocked(sendTelegramPhoto).mock.calls[0][2];
      expect(caption).toContain("Pasta");
      expect(caption).toContain("ingredient");
    });
  });

  describe("Telegram-triggered save — image upload", () => {
    it("uploads non-ImageKit imageUrl to ImageKit before saving", async () => {
      setupDb(baseJob);
      vi.mocked(parseRecipeFromUrl).mockResolvedValue(baseRecipe as any);
      vi.mocked(uploadImageServer).mockResolvedValue({
        url: IMAGEKIT_URL,
        fileId: "file-1",
      });

      await POST(makeRequest({ jobId: "job-1" }));

      expect(uploadImageServer).toHaveBeenCalledWith(CDN_URL);
      const insertValues = vi.mocked(db.insert("" as any).values as any).mock
        .calls[0][0];
      expect(insertValues.imageUrl).toBe(IMAGEKIT_URL);
      expect(insertValues.imageFileId).toBe("file-1");
    });

    it("skips upload when imageUrl is already on ImageKit", async () => {
      vi.mocked(isImageKitUrl).mockReturnValue(true);
      setupDb(baseJob);
      vi.mocked(parseRecipeFromUrl).mockResolvedValue({
        ...baseRecipe,
        imageUrl: IMAGEKIT_URL,
      } as any);

      await POST(makeRequest({ jobId: "job-1" }));

      expect(uploadImageServer).not.toHaveBeenCalled();
      const insertValues = vi.mocked(db.insert("" as any).values as any).mock
        .calls[0][0];
      expect(insertValues.imageUrl).toBe(IMAGEKIT_URL);
      expect(insertValues.imageFileId).toBeNull();
    });

    it("saves recipe with null imageFileId when imageUrl is null", async () => {
      setupDb(baseJob);
      vi.mocked(parseRecipeFromUrl).mockResolvedValue({
        ...baseRecipe,
        imageUrl: undefined,
      } as any);

      await POST(makeRequest({ jobId: "job-1" }));

      expect(uploadImageServer).not.toHaveBeenCalled();
      const insertValues = vi.mocked(db.insert("" as any).values as any).mock
        .calls[0][0];
      expect(insertValues.imageUrl).toBeNull();
      expect(insertValues.imageFileId).toBeNull();
    });

    it("keeps original CDN URL when upload fails", async () => {
      setupDb(baseJob);
      vi.mocked(parseRecipeFromUrl).mockResolvedValue(baseRecipe as any);
      vi.mocked(uploadImageServer).mockRejectedValue(
        new Error("Upload failed"),
      );

      await POST(makeRequest({ jobId: "job-1" }));

      const insertValues = vi.mocked(db.insert("" as any).values as any).mock
        .calls[0][0];
      expect(insertValues.imageUrl).toBe(CDN_URL);
      expect(insertValues.imageFileId).toBeNull();
      expect(captureError).toHaveBeenCalled();
    });

    it("does not report a source CDN that refuses the image fetch", async () => {
      setupDb(baseJob);
      vi.mocked(parseRecipeFromUrl).mockResolvedValue(baseRecipe as any);
      vi.mocked(uploadImageServer).mockRejectedValue(
        new Error("Failed to fetch image (403) from cdn.example.com"),
      );

      await POST(makeRequest({ jobId: "job-1" }));

      const insertValues = vi.mocked(db.insert("" as any).values as any).mock
        .calls[0][0];
      expect(insertValues.imageUrl).toBe(CDN_URL);
      expect(captureError).not.toHaveBeenCalled();
    });
  });

  describe("Telegram-triggered save — notify failures don't undo the save", () => {
    it("falls back to a text message when the saved image isn't on ImageKit", async () => {
      setupDb(baseJob);
      vi.mocked(parseRecipeFromUrl).mockResolvedValue(baseRecipe as any);
      vi.mocked(uploadImageServer).mockRejectedValue(
        new Error("Upload failed"),
      );

      await POST(makeRequest({ jobId: "job-1" }));

      expect(sendTelegramPhoto).not.toHaveBeenCalled();
      expect(sendTelegramMessage).toHaveBeenCalledWith(
        "chat-1",
        expect.stringContaining("Pasta"),
        expect.objectContaining({ inline_keyboard: expect.anything() }),
      );
    });

    it("delivers the card as text when Telegram rejects the photo", async () => {
      const { updateChain } = setupDb(baseJob);
      vi.mocked(parseRecipeFromUrl).mockResolvedValue(baseRecipe as any);
      vi.mocked(sendTelegramPhoto).mockRejectedValue(
        new Error("Telegram sendPhoto failed: 400"),
      );

      await POST(makeRequest({ jobId: "job-1" }));

      expect(sendTelegramMessage).toHaveBeenCalledWith(
        "chat-1",
        expect.stringContaining("Pasta"),
        expect.objectContaining({ inline_keyboard: expect.anything() }),
      );
      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: "done" }),
      );
      expect(updateChain.set).not.toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed" }),
      );
      expect(captureError).not.toHaveBeenCalled();
    });

    it("keeps the job done and reports the error when the text fallback also throws", async () => {
      const { updateChain } = setupDb(baseJob);
      vi.mocked(parseRecipeFromUrl).mockResolvedValue(baseRecipe as any);
      vi.mocked(sendTelegramPhoto).mockRejectedValue(
        new Error("Telegram sendPhoto failed: 400"),
      );
      vi.mocked(sendTelegramMessage).mockRejectedValue(
        new Error("Telegram sendMessage failed: 403"),
      );

      await POST(makeRequest({ jobId: "job-1" }));

      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: "done" }),
      );
      expect(updateChain.set).not.toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed" }),
      );
      expect(captureError).toHaveBeenCalled();
    });
  });
});
