import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureError } from "@/lib/telemetry";
import { deleteImage, isImageKitUrl, uploadImage } from "@/lib/upload/images";
import {
  resolveInstructionImages,
  resolveMainImage,
} from "../resolve-recipe-images";

vi.mock("@/lib/upload/images", () => ({
  uploadImage: vi.fn(),
  deleteImage: vi.fn(),
  isImageKitUrl: vi.fn(),
}));

vi.mock("@/lib/telemetry", () => ({
  captureError: vi.fn(),
}));

const IMAGEKIT_URL = "https://ik.imagekit.io/test/recipe.jpg";
const CDN_URL = "https://cdninstagram.com/photo.jpg";

interface TestInstruction {
  order: number;
  instruction: string;
  imageUrl?: string;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isImageKitUrl).mockImplementation((url) => url === IMAGEKIT_URL);
  vi.mocked(deleteImage).mockResolvedValue(undefined);
});

describe("resolveMainImage", () => {
  it("skips upload and keeps the URL when it's already on ImageKit", async () => {
    const result = await resolveMainImage({
      pendingFile: null,
      currentImageUrl: IMAGEKIT_URL,
      previousImageFileId: "old-file",
    });

    expect(uploadImage).not.toHaveBeenCalled();
    expect(result).toEqual({
      imageUrl: IMAGEKIT_URL,
      imageFileId: "old-file",
      uploadFailed: false,
    });
  });

  it("uploads a pending pasted/picked file and deletes the previous image after success", async () => {
    const file = new File(["x"], "photo.png", { type: "image/png" });
    vi.mocked(uploadImage).mockResolvedValue({
      url: IMAGEKIT_URL,
      fileId: "new-file",
    });

    const result = await resolveMainImage({
      pendingFile: file,
      currentImageUrl: "",
      previousImageFileId: "old-file",
    });

    expect(uploadImage).toHaveBeenCalledWith(file, undefined);
    expect(deleteImage).toHaveBeenCalledWith("old-file", undefined);
    expect(result).toEqual({
      imageUrl: IMAGEKIT_URL,
      imageFileId: "new-file",
      uploadFailed: false,
    });
  });

  it("uploads a non-ImageKit source URL when no file was picked", async () => {
    vi.mocked(uploadImage).mockResolvedValue({
      url: IMAGEKIT_URL,
      fileId: "new-file",
    });

    const result = await resolveMainImage({
      pendingFile: null,
      currentImageUrl: CDN_URL,
      previousImageFileId: undefined,
    });

    expect(uploadImage).toHaveBeenCalledWith(CDN_URL, undefined);
    expect(deleteImage).not.toHaveBeenCalled();
    expect(result.imageUrl).toBe(IMAGEKIT_URL);
  });

  it("keeps the previous image, reports failure, and captures the error without deleting anything when the upload fails", async () => {
    const file = new File(["x"], "photo.png", { type: "image/png" });
    const uploadError = new Error("network error");
    vi.mocked(uploadImage).mockRejectedValue(uploadError);

    const result = await resolveMainImage({
      pendingFile: file,
      currentImageUrl: CDN_URL,
      previousImageFileId: "old-file",
    });

    expect(deleteImage).not.toHaveBeenCalled();
    expect(result).toEqual({
      imageUrl: CDN_URL,
      imageFileId: "old-file",
      uploadFailed: true,
    });
    expect(captureError).toHaveBeenCalledWith(uploadError, expect.anything());
  });

  it("is a no-op when there is neither a pending file nor a URL", async () => {
    const result = await resolveMainImage({
      pendingFile: null,
      currentImageUrl: "",
      previousImageFileId: undefined,
    });

    expect(uploadImage).not.toHaveBeenCalled();
    expect(result).toEqual({
      imageUrl: "",
      imageFileId: undefined,
      uploadFailed: false,
    });
  });
});

describe("resolveInstructionImages", () => {
  it("uploads a pending step file keyed by row id", async () => {
    const file = new File(["x"], "step.png", { type: "image/png" });
    vi.mocked(uploadImage).mockResolvedValue({
      url: IMAGEKIT_URL,
      fileId: "step-file",
    });

    const result = await resolveInstructionImages<TestInstruction>({
      instructions: [{ order: 1, instruction: "Mix" }],
      instructionRowIds: ["step-1"],
      pendingStepFiles: { "step-1": file },
    });

    expect(uploadImage).toHaveBeenCalledWith(file, undefined);
    expect(result.instructions[0].imageUrl).toBe(IMAGEKIT_URL);
    expect(result.uploadFailed).toBe(false);
  });

  it("uploads a non-ImageKit step imageUrl when there's no pending file", async () => {
    vi.mocked(uploadImage).mockResolvedValue({
      url: IMAGEKIT_URL,
      fileId: "step-file",
    });

    const result = await resolveInstructionImages({
      instructions: [{ order: 1, instruction: "Mix", imageUrl: CDN_URL }],
      instructionRowIds: ["step-1"],
      pendingStepFiles: {},
    });

    expect(uploadImage).toHaveBeenCalledWith(CDN_URL, undefined);
    expect(result.instructions[0].imageUrl).toBe(IMAGEKIT_URL);
    expect(result.uploadFailed).toBe(false);
  });

  it("leaves a step untouched when it has no image at all", async () => {
    const result = await resolveInstructionImages<TestInstruction>({
      instructions: [{ order: 1, instruction: "Mix" }],
      instructionRowIds: ["step-1"],
      pendingStepFiles: {},
    });

    expect(uploadImage).not.toHaveBeenCalled();
    expect(result.instructions[0].imageUrl).toBeUndefined();
    expect(result.uploadFailed).toBe(false);
  });

  it("keeps the step's existing imageUrl, reports failure, and captures the error when its upload fails", async () => {
    const uploadError = new Error("network error");
    vi.mocked(uploadImage).mockRejectedValue(uploadError);

    const result = await resolveInstructionImages({
      instructions: [{ order: 1, instruction: "Mix", imageUrl: CDN_URL }],
      instructionRowIds: ["step-1"],
      pendingStepFiles: {},
    });

    expect(result.instructions[0].imageUrl).toBe(CDN_URL);
    expect(result.uploadFailed).toBe(true);
    expect(captureError).toHaveBeenCalledWith(uploadError, expect.anything());
  });
});
