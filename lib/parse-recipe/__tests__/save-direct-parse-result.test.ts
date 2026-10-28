import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedRecipe } from "@/lib/db/schema";

const { mockAdd, mockUpload, mockIsImageKit, mockToast } = vi.hoisted(() => ({
  mockAdd: vi.fn(),
  mockUpload: vi.fn(),
  mockIsImageKit: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock("@/lib/db/db", () => ({
  db: { parsedRecipes: { add: mockAdd, delete: vi.fn() } },
}));
vi.mock("@/lib/db/save-parsed-recipe", () => ({ saveParsedRecipe: vi.fn() }));
vi.mock("@/lib/upload/images", () => ({
  isImageKitUrl: mockIsImageKit,
  uploadImage: mockUpload,
}));
vi.mock("sonner", () => ({ toast: mockToast }));

import { saveDirectParseResult } from "../save-direct-parse-result";

const LABELS = {
  fallbackTitle: "Untitled",
  description: "Review it",
  save: "Save",
  edit: "Edit",
  saved: "Saved",
};

function recipe(overrides: Partial<ParsedRecipe> = {}): ParsedRecipe {
  return {
    title: "Borscht",
    servings: undefined,
    ingredients: [{ item: "beet" }],
    instructions: [{ text: "Cook" }],
    sourceUrl: "https://echoed.test/link",
    ...overrides,
  } as unknown as ParsedRecipe;
}

function savedEntry() {
  return mockAdd.mock.calls[0][0];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAdd.mockResolvedValue(undefined);
  mockIsImageKit.mockImplementation((url: string) =>
    url.startsWith("https://ik.test/"),
  );
});

describe("saveDirectParseResult", () => {
  describe("review entry", () => {
    it("queues the recipe without a source url and with null servings", async () => {
      await saveDirectParseResult(recipe(), "en", LABELS);

      expect(savedEntry()).toMatchObject({
        title: "Borscht",
        servings: null,
        ingredients: [{ item: "beet" }],
      });
      expect(savedEntry().sourceUrl).toBeUndefined();
      expect(savedEntry().id).toEqual(expect.any(String));
      expect(savedEntry().createdAt).toBeInstanceOf(Date);
    });

    it("shows the review toast titled after the recipe", async () => {
      await saveDirectParseResult(recipe({ title: "" }), "en", LABELS);

      expect(mockToast).toHaveBeenCalledWith(
        "Untitled",
        expect.objectContaining({ description: "Review it" }),
      );
    });
  });

  describe("image mirroring", () => {
    it("mirrors a non-ImageKit image and stores the copy", async () => {
      mockUpload.mockResolvedValue({
        url: "https://ik.test/a.jpg",
        fileId: "f1",
      });

      await saveDirectParseResult(
        recipe({ imageUrl: "https://cdn.test/a.jpg" }),
        "en",
        LABELS,
      );

      expect(savedEntry()).toMatchObject({
        imageUrl: "https://ik.test/a.jpg",
        imageFileId: "f1",
      });
    });

    it("keeps an ImageKit image as it is", async () => {
      await saveDirectParseResult(
        recipe({ imageUrl: "https://ik.test/a.jpg" }),
        "en",
        LABELS,
      );

      expect(mockUpload).not.toHaveBeenCalled();
      expect(savedEntry().imageUrl).toBe("https://ik.test/a.jpg");
    });

    it("still queues the recipe when the mirror fails", async () => {
      mockUpload.mockRejectedValue(new Error("upload failed"));

      await saveDirectParseResult(
        recipe({ imageUrl: "https://cdn.test/a.jpg" }),
        "en",
        LABELS,
      );

      expect(mockAdd).toHaveBeenCalledOnce();
      expect(savedEntry().imageFileId).toBeUndefined();
    });
  });
});
