/**
 * @vitest-environment happy-dom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseRecipeFromPhoto } from "../photo";

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/api-fetch", () => ({ apiFetch }));

const canvasSizes: Array<{ width: number; height: number }> = [];
const drawImage = vi.fn();
const closeBitmap = vi.fn();

class FakeOffscreenCanvas {
  constructor(width: number, height: number) {
    canvasSizes.push({ width, height });
  }
  getContext() {
    return { drawImage };
  }
  convertToBlob() {
    return Promise.resolve(new Blob(["jpeg-bytes"], { type: "image/jpeg" }));
  }
}

function stubBitmap(width: number, height: number) {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width, height, close: closeBitmap }),
  );
}

function jsonResponse(body: object, ok = true) {
  return { ok, json: () => Promise.resolve(body) } as Response;
}

const PHOTO = new File(["raw"], "dish.heic", { type: "image/heic" });

describe("parseRecipeFromPhoto", () => {
  beforeEach(() => {
    canvasSizes.length = 0;
    vi.stubGlobal("OffscreenCanvas", FakeOffscreenCanvas);
    stubBitmap(800, 600);
    apiFetch.mockResolvedValue(jsonResponse({ title: "Varenyky" }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("compression", () => {
    it("scales the longest side down to 1024px", async () => {
      stubBitmap(4032, 3024);

      await parseRecipeFromPhoto(PHOTO, "job-1");

      expect(canvasSizes).toEqual([{ width: 1024, height: 768 }]);
    });

    it("never upscales a small photo", async () => {
      await parseRecipeFromPhoto(PHOTO, "job-1");

      expect(canvasSizes).toEqual([{ width: 800, height: 600 }]);
    });

    it("releases the decoded bitmap once it is drawn", async () => {
      await parseRecipeFromPhoto(PHOTO, "job-1");

      expect(closeBitmap).toHaveBeenCalledOnce();
    });

    it("sends the photo as base64 JPEG with the job id", async () => {
      await parseRecipeFromPhoto(PHOTO, "job-7");

      const body = JSON.parse(apiFetch.mock.calls[0][1].body);
      expect(body).toEqual({
        imageBase64: btoa("jpeg-bytes"),
        mimeType: "image/jpeg",
        jobId: "job-7",
      });
    });
  });

  describe("response", () => {
    it("returns the parsed recipe", async () => {
      const recipe = await parseRecipeFromPhoto(PHOTO, "job-1");

      expect(recipe).toEqual({ title: "Varenyky" });
    });

    it.each([
      ["503 Service Unavailable", /high demand/],
      ["model under high demand", /high demand/],
      ["429 Too Many Requests", /quota exceeded/],
      ["quota reached", /quota exceeded/],
      ["Not a recipe", /^Not a recipe$/],
    ])("maps the server error %j", async (serverError, expected) => {
      apiFetch.mockResolvedValue(jsonResponse({ error: serverError }, false));

      await expect(parseRecipeFromPhoto(PHOTO, "job-1")).rejects.toThrow(
        expected,
      );
    });

    it("falls back to a generic message for an unreadable error body", async () => {
      apiFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.reject(new SyntaxError("bad json")),
      } as Response);

      await expect(parseRecipeFromPhoto(PHOTO, "job-1")).rejects.toThrow(
        "Parse failed",
      );
    });
  });

  it("fails before calling the API when there is no 2d context", async () => {
    vi.stubGlobal(
      "OffscreenCanvas",
      class extends FakeOffscreenCanvas {
        getContext() {
          return null as never;
        }
      },
    );

    await expect(parseRecipeFromPhoto(PHOTO, "job-1")).rejects.toThrow(
      "Could not get canvas 2d context",
    );
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
