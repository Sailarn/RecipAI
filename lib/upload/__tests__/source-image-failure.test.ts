import { describe, expect, it } from "vitest";
import {
  isSourceImageUnavailable,
  SOURCE_FETCH_FAILED,
  sourceFetchFailedMessage,
} from "@/lib/upload/source-image-failure";
import { UPLOAD_ERRORS } from "@/lib/upload/upload-limits";

describe("isSourceImageUnavailable", () => {
  describe("expected source-CDN failures", () => {
    it("recognises the server-side status message", () => {
      const error = new Error(
        sourceFetchFailedMessage(403, "p19-common-sign.tiktokcdn-us.com"),
      );

      expect(isSourceImageUnavailable(error)).toBe(true);
    });

    it("recognises the message rebuilt by the browser from the 400 body", () => {
      expect(isSourceImageUnavailable(new Error(SOURCE_FETCH_FAILED))).toBe(
        true,
      );
    });

    it("recognises undici's bare network failure", () => {
      expect(isSourceImageUnavailable(new TypeError("fetch failed"))).toBe(
        true,
      );
    });
  });

  describe("genuine upload defects", () => {
    it("does not swallow validation failures", () => {
      expect(
        isSourceImageUnavailable(new Error(UPLOAD_ERRORS.UNSUPPORTED_TYPE)),
      ).toBe(false);
      expect(
        isSourceImageUnavailable(new Error(UPLOAD_ERRORS.FILE_TOO_LARGE)),
      ).toBe(false);
    });

    it("does not swallow ImageKit errors", () => {
      expect(
        isSourceImageUnavailable(new Error("Your account cannot be accessed")),
      ).toBe(false);
    });

    it("returns false for non-Error throws", () => {
      expect(isSourceImageUnavailable({ message: "fetch failed" })).toBe(false);
      expect(isSourceImageUnavailable("fetch failed")).toBe(false);
      expect(isSourceImageUnavailable(null)).toBe(false);
    });
  });
});
