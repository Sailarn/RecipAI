import { deleteImage, isImageKitUrl, uploadImage } from "@/lib/upload/images";

interface UploadOptions {
  uploadToken?: string;
}

interface ResolvedImage {
  imageUrl: string;
  imageFileId?: string;
  uploadFailed: boolean;
}

interface ResolveMainImageInput {
  pendingFile: File | null;
  currentImageUrl: string;
  previousImageFileId?: string;
  uploadOptions?: UploadOptions;
}

// Uploads the new image (if any) and only deletes the previous one once that
// succeeds — never the other way around, or a failed upload would lose both.
// Awaited by the caller before the recipe is written, so the saved row always
// carries a real, durable imageUrl instead of a stale one silently patched in
// after the user has already navigated away.
export async function resolveMainImage({
  pendingFile,
  currentImageUrl,
  previousImageFileId,
  uploadOptions,
}: ResolveMainImageInput): Promise<ResolvedImage> {
  const source = pendingFile ?? currentImageUrl;
  const needsUpload =
    pendingFile !== null ||
    (currentImageUrl !== "" && !isImageKitUrl(currentImageUrl));

  if (!needsUpload) {
    return {
      imageUrl: currentImageUrl,
      imageFileId: previousImageFileId,
      uploadFailed: false,
    };
  }

  try {
    const uploaded = await uploadImage(source, uploadOptions);
    if (previousImageFileId) {
      await deleteImage(previousImageFileId, uploadOptions).catch(() => {});
    }
    return {
      imageUrl: uploaded.url,
      imageFileId: uploaded.fileId,
      uploadFailed: false,
    };
  } catch {
    return {
      imageUrl: currentImageUrl,
      imageFileId: previousImageFileId,
      uploadFailed: true,
    };
  }
}

interface InstructionWithImage {
  imageUrl?: string;
  order: number;
}

interface ResolveInstructionImagesInput<T extends InstructionWithImage> {
  instructions: T[];
  // The row id react-hook-form assigned each instruction, indexed by
  // (1-based) order - 1 — instructionRows is the pre-renumber array they came from.
  instructionRowIds: (string | undefined)[];
  pendingStepFiles: Record<string, File>;
  uploadOptions?: UploadOptions;
}

// Same upload-before-write treatment as resolveMainImage, applied per step photo.
export async function resolveInstructionImages<T extends InstructionWithImage>({
  instructions,
  instructionRowIds,
  pendingStepFiles,
  uploadOptions,
}: ResolveInstructionImagesInput<T>): Promise<T[]> {
  const resolved: T[] = [];
  for (const instruction of instructions) {
    const stepId = instructionRowIds[instruction.order - 1];
    const stepFile = stepId ? pendingStepFiles[stepId] : undefined;
    const source =
      stepFile ??
      (instruction.imageUrl && !isImageKitUrl(instruction.imageUrl)
        ? instruction.imageUrl
        : undefined);

    if (!source) {
      resolved.push(instruction);
      continue;
    }

    try {
      const uploaded = await uploadImage(source, uploadOptions);
      resolved.push({ ...instruction, imageUrl: uploaded.url });
    } catch {
      resolved.push(instruction);
    }
  }
  return resolved;
}
