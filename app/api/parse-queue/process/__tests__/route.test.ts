import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    update: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@/db/schema/parse-jobs", () => ({ parseJobs: {} }));
vi.mock("@/db/schema/recipes", () => ({ recipes: {} }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

vi.mock("@/lib/imagekit", () => ({
  uploadImageServer: vi.fn(),
}));

vi.mock("@/lib/images", () => ({
  isImageKitUrl: vi.fn(),
}));

vi.mock("@/lib/parse-recipe", () => ({
  parseRecipeFromUrl: vi.fn(),
}));

vi.mock("@/lib/telegram-bot", () => ({
  sendTelegramMessage: vi.fn(),
}));

import { db } from "@/db";
import { uploadImageServer } from "@/lib/imagekit";
import { isImageKitUrl } from "@/lib/images";
import { parseRecipeFromUrl } from "@/lib/parse-recipe";
import { POST } from "../route";

const IMAGEKIT_URL = "https://ik.imagekit.io/test/recipes/recipe-123.jpg";
const CDN_URL = "https://cdninstagram.com/photo.jpg";

const baseJob = {
  id: "job-1",
  url: "https://instagram.com/reel/abc",
  userId: "user-1",
  telegramChatId: "chat-1",
  userComment: null,
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
  const updateChain = { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };
  vi.mocked(db.update).mockReturnValue(updateChain as any);

  const selectChain = { from: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(job ? [job] : []) };
  vi.mocked(db.select).mockReturnValue(selectChain as any);

  const insertChain = { values: vi.fn().mockResolvedValue(undefined) };
  vi.mocked(db.insert).mockReturnValue(insertChain as any);

  return { updateChain, selectChain, insertChain };
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

  describe("Telegram-triggered save — image upload", () => {
    it("uploads non-ImageKit imageUrl to ImageKit before saving", async () => {
      setupDb(baseJob);
      vi.mocked(parseRecipeFromUrl).mockResolvedValue(baseRecipe as any);
      vi.mocked(uploadImageServer).mockResolvedValue({ url: IMAGEKIT_URL, fileId: "file-1" });

      await POST(makeRequest({ jobId: "job-1" }));

      expect(uploadImageServer).toHaveBeenCalledWith(CDN_URL);
      const insertValues = vi.mocked(db.insert("" as any).values as any).mock.calls[0][0];
      expect(insertValues.imageUrl).toBe(IMAGEKIT_URL);
      expect(insertValues.imageFileId).toBe("file-1");
    });

    it("skips upload when imageUrl is already on ImageKit", async () => {
      vi.mocked(isImageKitUrl).mockReturnValue(true);
      setupDb(baseJob);
      vi.mocked(parseRecipeFromUrl).mockResolvedValue({ ...baseRecipe, imageUrl: IMAGEKIT_URL } as any);

      await POST(makeRequest({ jobId: "job-1" }));

      expect(uploadImageServer).not.toHaveBeenCalled();
      const insertValues = vi.mocked(db.insert("" as any).values as any).mock.calls[0][0];
      expect(insertValues.imageUrl).toBe(IMAGEKIT_URL);
      expect(insertValues.imageFileId).toBeNull();
    });

    it("saves recipe with null imageFileId when imageUrl is null", async () => {
      setupDb(baseJob);
      vi.mocked(parseRecipeFromUrl).mockResolvedValue({ ...baseRecipe, imageUrl: undefined } as any);

      await POST(makeRequest({ jobId: "job-1" }));

      expect(uploadImageServer).not.toHaveBeenCalled();
      const insertValues = vi.mocked(db.insert("" as any).values as any).mock.calls[0][0];
      expect(insertValues.imageUrl).toBeNull();
      expect(insertValues.imageFileId).toBeNull();
    });

    it("keeps original CDN URL when upload fails", async () => {
      setupDb(baseJob);
      vi.mocked(parseRecipeFromUrl).mockResolvedValue(baseRecipe as any);
      vi.mocked(uploadImageServer).mockRejectedValue(new Error("Upload failed"));

      await POST(makeRequest({ jobId: "job-1" }));

      const insertValues = vi.mocked(db.insert("" as any).values as any).mock.calls[0][0];
      expect(insertValues.imageUrl).toBe(CDN_URL);
      expect(insertValues.imageFileId).toBeNull();
    });
  });
});
