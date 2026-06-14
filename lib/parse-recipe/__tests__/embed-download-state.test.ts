import { beforeEach, describe, expect, it } from "vitest";
import {
  isEmbedDownloadInterrupted,
  isEmbedModelReady,
  markEmbedDownloadStarted,
  markEmbedModelReady,
} from "../embed-download-state";

describe("embed-download-state", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reports not-ready and not-interrupted on a clean slate", () => {
    expect(isEmbedModelReady()).toBe(false);
    expect(isEmbedDownloadInterrupted()).toBe(false);
  });

  it("marks a started download as interrupted until it is ready", () => {
    markEmbedDownloadStarted();

    expect(isEmbedDownloadInterrupted()).toBe(true);
    expect(isEmbedModelReady()).toBe(false);
  });

  it("clears the interrupted state once the model is ready", () => {
    markEmbedDownloadStarted();
    markEmbedModelReady();

    expect(isEmbedModelReady()).toBe(true);
    expect(isEmbedDownloadInterrupted()).toBe(false);
  });

  it("does not re-mark a download as started once the model is ready", () => {
    markEmbedModelReady();
    markEmbedDownloadStarted();

    expect(isEmbedDownloadInterrupted()).toBe(false);
    expect(isEmbedModelReady()).toBe(true);
  });
});
