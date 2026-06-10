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
}));

import { db } from "@/db";
import { parseRecipeFromUrl } from "@/lib/parse-recipe";
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
  vi.mocked(isImageKitUrl).mockReturnValue(false);
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

    it("does not send a push when the job has no endpoint", async () => {
      setupDb({ ...baseJob, telegramChatId: null });
      vi.mocked(parseRecipeFromUrl).mockResolvedValue(baseRecipe as any);

      await POST(makeRequest({ jobId: "job-1" }));

      expect(sendPushNotification).not.toHaveBeenCalled();
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
    });
  });
});
